import pb from "./pocketbase";
import {
	getFromStorage,
	setInStorage,
	removeFromStorage,
	browserAPI,
} from "./browser";
import type { User, AuthState } from "../types";

const AUTH_STORAGE_KEY = "auth_state";
const AUTH_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

let lastAuthRefreshAt = 0;

function unauthenticatedState(): AuthState {
	return {
		isAuthenticated: false,
		user: null,
		token: null,
	};
}

function isAuthError(error: any): boolean {
	if (error?.status === 401 || error?.status === 403) {
		return true;
	}

	const message = String(error?.message || "").toLowerCase();
	return (
		message.includes("requires valid record authorization token") ||
		message.includes("invalid token") ||
		message.includes("token is invalid")
	);
}

/**
 * Save auth state to storage
 */
export async function saveAuthState(token: string, user: User): Promise<void> {
	const authState: AuthState = {
		isAuthenticated: true,
		user,
		token,
	};

	await setInStorage(AUTH_STORAGE_KEY, authState);
}

/**
 * Get auth state from storage
 */
export async function getAuthState(): Promise<AuthState> {
	try {
		const authState = await getFromStorage<AuthState>(AUTH_STORAGE_KEY);

		if (authState && authState.token) {
			// Restore PocketBase auth state
			pb.authStore.save(authState.token, authState.user);

			// Token is expired/invalid locally -> clear stale state immediately
			if (!pb.authStore.isValid) {
				await clearAuthState();
				return unauthenticatedState();
			}

			// Refresh auth periodically to keep the session valid and synced.
			const now = Date.now();
			if (now - lastAuthRefreshAt < AUTH_REFRESH_INTERVAL_MS) {
				return authState;
			}

			lastAuthRefreshAt = now;

			try {
				const refreshed = await pb.collection("users").authRefresh<User>();
				const refreshedUser = refreshed.record as unknown as User;

				await saveAuthState(pb.authStore.token, refreshedUser);

				return {
					isAuthenticated: true,
					user: refreshedUser,
					token: pb.authStore.token,
				};
			} catch (error: any) {
				if (isAuthError(error)) {
					await clearAuthState();
					return unauthenticatedState();
				}

				// Keep the locally valid state when refresh fails for transient reasons.
				return authState;
			}
		}

		return unauthenticatedState();
	} catch (error) {
		return unauthenticatedState();
	}
}

/**
 * Clear auth state from storage
 */
export async function clearAuthState(): Promise<void> {
	await removeFromStorage(AUTH_STORAGE_KEY);
	pb.authStore.clear();
	lastAuthRefreshAt = 0;
}

/**
 * Parse PocketBase validation errors into user-friendly messages
 */
function parseRegistrationError(error: any): string {
	// PocketBase SDK wraps errors - check response.data first
	const data = error?.response?.data || error?.data;

	if (!data) {
		return error?.message || "Registration failed. Please try again.";
	}

	// Check for specific field errors
	if (data.email) {
		if (data.email.code === "validation_not_unique") {
			return "This email address is already registered.";
		}
		if (data.email.code === "validation_invalid_email") {
			return "Please enter a valid email address.";
		}
	}

	if (data.username) {
		if (data.username.code === "validation_not_unique") {
			return "This username is already taken.";
		}
		if (data.username.code === "validation_length_out_of_range") {
			return "Username must be between 3 and 150 characters.";
		}
	}

	if (data.password) {
		if (data.password.code === "validation_length_out_of_range") {
			return "Password must be at least 8 characters.";
		}
	}

	if (data.passwordConfirm) {
		if (data.passwordConfirm.code === "validation_values_mismatch") {
			return "Passwords do not match.";
		}
	}

	// Fallback to generic message
	return error?.message || "Registration failed. Please try again.";
}

/**
 * Register a new user
 */
export async function register(
	email: string,
	username: string,
	password: string,
	passwordConfirm: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		// Create user account - onboarding not yet complete
		await pb.collection("users").create({
			email,
			username,
			password,
			passwordConfirm,
			onboarding_completed: false,
		});

		// Send verification email
		await pb.collection("users").requestVerification(email);

		return {
			success: true,
		};
	} catch (error: any) {
		return {
			success: false,
			error: parseRegistrationError(error),
		};
	}
}

/**
 * Login user
 */
export async function login(
	emailOrUsername: string,
	password: string,
): Promise<{
	success: boolean;
	error?: string;
	user?: User;
	needsVerification?: boolean;
}> {
	try {
		const authData = await pb
			.collection("users")
			.authWithPassword(emailOrUsername, password);

		const user = authData.record as unknown as User;

		// Check if email is verified
		if (!user.verified) {
			// Clear auth state - don't allow unverified users to stay logged in
			pb.authStore.clear();
			return {
				success: false,
				error: "Please verify your email address before logging in.",
				needsVerification: true,
			};
		}

		// Save auth state to storage
		await saveAuthState(pb.authStore.token, user);

		return {
			success: true,
			user,
		};
	} catch (error: any) {
		return {
			success: false,
			error: error?.message || "Login failed. Please check your credentials.",
		};
	}
}

/**
 * Generate a cryptographically random state parameter for OAuth CSRF protection.
 */
function generateOAuthState(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
		"",
	);
}

const OAUTH_STATE_STORAGE_KEY = "oauth_state";

/**
 * Login with Google OAuth - Tab-based flow
 * This version is for use in a full page (tab) context, not a popup.
 * If it's a new user, it returns the user and token without saving auth state,
 * so the UI can show terms acceptance first.
 */
export async function loginWithGoogleInTab(): Promise<{
	success: boolean;
	error?: string;
	user?: User;
	isNewUser?: boolean;
	pendingToken?: string;
}> {
	try {
		// Get the OAuth2 auth methods from PocketBase to get the authorization URL
		const authMethods = await pb.collection("users").listAuthMethods();
		const googleProvider = authMethods.oauth2?.providers?.find(
			(p) => p.name === "google",
		);

		if (!googleProvider) {
			return {
				success: false,
				error: "Google login is not configured.",
			};
		}

		// Get the extension's redirect URL (works for both Chrome and Firefox)
		const redirectUrl = browserAPI.identity.getRedirectURL();

		// Generate a cryptographically random state parameter and persist it
		// before redirecting so we can verify it on return (CSRF protection).
		const state = generateOAuthState();
		await setInStorage(OAUTH_STATE_STORAGE_KEY, state);

		// Build the authorization URL, overriding any provider-supplied state
		// with our own securely generated value.
		const authUrlObj = new URL(googleProvider.authURL);
		authUrlObj.searchParams.set("state", state);
		authUrlObj.searchParams.set("redirect_uri", redirectUrl);
		const authUrl = authUrlObj.toString();

		// Launch the OAuth flow in a popup window
		const responseUrl = await browserAPI.identity.launchWebAuthFlow({
			url: authUrl,
			interactive: true,
		});

		if (!responseUrl) {
			await removeFromStorage(OAUTH_STATE_STORAGE_KEY);
			return {
				success: false,
				error: "Authentication was cancelled.",
			};
		}

		// Parse the response URL to get the code
		const urlParams = new URL(responseUrl).searchParams;
		const code = urlParams.get("code");
		const returnedState = urlParams.get("state");
		const error = urlParams.get("error");

		// Retrieve and immediately remove the stored state (one-time use).
		const storedState = await getFromStorage<string>(OAUTH_STATE_STORAGE_KEY);
		await removeFromStorage(OAUTH_STATE_STORAGE_KEY);

		if (error) {
			return {
				success: false,
				error:
					error === "access_denied"
						? "Login was cancelled."
						: `Authentication error: ${error}`,
			};
		}

		if (!code) {
			return {
				success: false,
				error: "No authorization code received.",
			};
		}

		// Compare returned state against our securely generated stored value.
		if (!storedState || returnedState !== storedState) {
			return {
				success: false,
				error: "Invalid state parameter. Please try again.",
			};
		}

		// Exchange the code for auth token - this will either login or create account
		const authData = await pb.collection("users").authWithOAuth2Code(
			"google",
			code,
			googleProvider.codeVerifier,
			redirectUrl,
			// createData: provide a temporary username for new user registration
			{
				username: `user_${Math.random().toString(36).substring(2, 8)}`,
			},
		);

		const user = authData.record as unknown as User;
		const meta = authData.meta;

		// Check if this is a new user by looking at the meta.isNew flag
		const isNewUser = meta?.isNew === true;

		if (isNewUser) {
			// New user - return user and token but don't save auth state yet
			// The UI will show terms acceptance, then call confirmGoogleRegistration
			const pendingToken = pb.authStore.token;
			pb.authStore.clear(); // Clear for now, will be restored after terms accepted

			return {
				success: true,
				isNewUser: true,
				user,
				pendingToken,
			};
		}

		// Existing user - save auth state and complete login
		await saveAuthState(pb.authStore.token, user);

		return {
			success: true,
			user,
			isNewUser: false,
		};
	} catch (error: any) {
		const message = error?.message || "";
		const normalizedMessage = message.toLowerCase();
		const userDeclined =
			normalizedMessage.includes("cancelled") ||
			normalizedMessage.includes("closed") ||
			normalizedMessage.includes("user denied") ||
			normalizedMessage.includes("approve access");

		if (userDeclined) {
			return {
				success: false,
				error: "Login was cancelled.",
			};
		}

		return {
			success: false,
			error: message || "Google login failed. Please try again.",
		};
	}
}

/**
 * Confirm Google registration after terms accepted
 * This takes the pending token and user from loginWithGoogleInTab and saves the auth state
 */
export async function confirmGoogleRegistration(
	pendingToken: string,
	user: User,
): Promise<{ success: boolean; error?: string; user?: User }> {
	try {
		// Restore the auth state with the pending token
		pb.authStore.save(pendingToken, user);

		// Update the user record to mark onboarding as complete
		const updatedRecord = await pb.collection("users").update(user.id, {
			onboarding_completed: true,
		});

		const updatedUser = updatedRecord as unknown as User;

		// Save to persistent storage with updated user
		await saveAuthState(pendingToken, updatedUser);

		return {
			success: true,
			user: updatedUser,
		};
	} catch (error: any) {
		return {
			success: false,
			error: error?.message || "Failed to complete registration",
		};
	}
}

/**
 * Check if a user needs to complete onboarding
 * Uses the onboarding_completed field from PocketBase
 */
export function needsUsernameSetup(user: User): boolean {
	return !user.onboarding_completed;
}

/**
 * Accept terms of service for an existing user
 * Used when a returning user needs to accept updated terms
 */
export async function acceptTerms(): Promise<{
	success: boolean;
	error?: string;
	user?: User;
}> {
	try {
		const currentUser = pb.authStore.model;
		if (!currentUser) {
			return { success: false, error: "You must be logged in" };
		}

		// Update the user record to mark onboarding as complete
		const updatedRecord = await pb.collection("users").update(currentUser.id, {
			onboarding_completed: true,
		});

		const user = updatedRecord as unknown as User;

		// Update stored auth state with new user data
		await saveAuthState(pb.authStore.token, user);

		return {
			success: true,
			user,
		};
	} catch (error: any) {
		return {
			success: false,
			error: error?.message || "Failed to accept terms.",
		};
	}
}

/**
 * Complete onboarding - accept terms and set username in one call
 * Used for new users who need to complete both steps
 */
export async function completeOnboarding(
	newUsername: string,
): Promise<{ success: boolean; error?: string; user?: User }> {
	try {
		const currentUser = pb.authStore.model;
		if (!currentUser) {
			return { success: false, error: "You must be logged in" };
		}

		// Update the user record with username and mark onboarding complete
		const updatedRecord = await pb.collection("users").update(currentUser.id, {
			username: newUsername,
			onboarding_completed: true,
		});

		const user = updatedRecord as unknown as User;

		// Update stored auth state with new user data
		await saveAuthState(pb.authStore.token, user);

		return {
			success: true,
			user,
		};
	} catch (error: any) {
		// Handle specific errors
		if (error?.response?.data?.username?.code === "validation_not_unique") {
			return {
				success: false,
				error: "This username is already taken. Please choose another.",
			};
		}

		return {
			success: false,
			error: error?.message || "Failed to complete onboarding.",
		};
	}
}

/**
 * Check if a user needs onboarding
 */
export function needsOnboarding(user: User): boolean {
	return !user.onboarding_completed;
}

/**
 * Update the current user's username
 */
export async function updateUsername(
	newUsername: string,
): Promise<{ success: boolean; error?: string; user?: User }> {
	try {
		const currentUser = pb.authStore.model;
		if (!currentUser) {
			return { success: false, error: "You must be logged in" };
		}

		// Update the username and mark onboarding complete
		const updatedRecord = await pb.collection("users").update(currentUser.id, {
			username: newUsername,
			onboarding_completed: true,
		});

		const user = updatedRecord as unknown as User;

		// Update stored auth state with new user data
		await saveAuthState(pb.authStore.token, user);

		return {
			success: true,
			user,
		};
	} catch (error: any) {
		// Handle specific errors
		if (error?.response?.data?.username?.code === "validation_not_unique") {
			return {
				success: false,
				error: "This username is already taken. Please choose another.",
			};
		}

		return {
			success: false,
			error: error?.message || "Failed to update username.",
		};
	}
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
	await clearAuthState();
}

/**
 * Request password reset
 */
export async function requestPasswordReset(
	email: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		await pb.collection("users").requestPasswordReset(email);
		return {
			success: true,
		};
	} catch (error: any) {
		return {
			success: false,
			error: error?.message || "Failed to send password reset email.",
		};
	}
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(
	email: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		await pb.collection("users").requestVerification(email);
		return {
			success: true,
		};
	} catch (error: any) {
		return {
			success: false,
			error: error?.message || "Failed to send verification email.",
		};
	}
}

/**
 * Check if the current user is an OAuth user (registered via Google, etc.)
 * Checks if the user has any linked external auth providers
 */
export async function isOAuthUser(): Promise<boolean> {
	try {
		const currentUser = pb.authStore.model;
		if (!currentUser) {
			return false;
		}

		// Get the list of external auths for this user
		const externalAuths = await pb
			.collection("users")
			.listExternalAuths(currentUser.id);
		return externalAuths.length > 0;
	} catch (error) {
		// Fallback: check username pattern
		const currentUser = pb.authStore.model;
		return currentUser?.username?.startsWith("user_") || false;
	}
}

/**
 * Delete user account and all related data
 * For regular users: requires password confirmation
 * For OAuth users: requires typing "DELETE" to confirm
 */
export async function deleteAccount(
	confirmation: string,
	isOAuth: boolean = false,
): Promise<{ success: boolean; error?: string }> {
	try {
		const currentUser = pb.authStore.model;
		if (!currentUser) {
			return { success: false, error: "You must be logged in" };
		}

		const userId = currentUser.id;
		const userEmail = currentUser.email;

		if (isOAuth) {
			// For OAuth users, verify they typed "DELETE"
			if (confirmation !== "DELETE") {
				return { success: false, error: "Please type DELETE to confirm" };
			}
		} else {
			// For regular users, re-authenticate to verify password
			try {
				await pb.collection("users").authWithPassword(userEmail, confirmation);
			} catch (error) {
				return { success: false, error: "Incorrect password" };
			}
		}

		// Delete all friend requests where user is sender or receiver
		const friendRequests = await pb.collection("friend_requests").getFullList({
			filter: `sender = "${userId}" || receiver = "${userId}"`,
		});

		for (const request of friendRequests) {
			await pb.collection("friend_requests").delete(request.id);
		}

		// Delete all link recommendations where user is sender or receiver
		const recommendations = await pb
			.collection("link_recommendations")
			.getFullList({
				filter: `sender = "${userId}" || receiver = "${userId}"`,
			});

		for (const rec of recommendations) {
			await pb.collection("link_recommendations").delete(rec.id);
		}

		// Delete the user account
		await pb.collection("users").delete(userId);

		// Clear local auth state
		await clearAuthState();

		return { success: true };
	} catch (error: any) {
		return {
			success: false,
			error: error?.message || "Failed to delete account. Please try again.",
		};
	}
}
