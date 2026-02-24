/**
 * Validate a username against PocketBase constraints.
 * Allowed characters: letters, numbers, underscores, hyphens (^[a-zA-Z0-9_-]+$)
 */
export function validateUsername(username: string): {
	valid: boolean;
	error?: string;
} {
	if (!username || username.trim().length === 0) {
		return { valid: false, error: "Username cannot be empty" };
	}
	if (username.length < 3 || username.length > 150) {
		return { valid: false, error: "Username must be 3–150 characters" };
	}
	if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
		return {
			valid: false,
			error: "Username can only contain letters, numbers, _ and -",
		};
	}
	return { valid: true };
}

/**
 * Sanitize a YouTube URL by stripping all query parameters except `v`.
 * Optionally appends a `t` (timestamp in seconds) parameter for regular watch URLs.
 * Returns null when the URL is not a valid youtube.com URL.
 */
export function sanitizeYouTubeUrl(
	url: string,
	timestampSeconds?: number | null,
): string | null {
	try {
		const parsed = new URL(url);
		if (!parsed.hostname.endsWith("youtube.com")) {
			return null;
		}
		// Shorts URLs have no `v` param — keep the path, strip all query params
		// Timestamps are not supported for Shorts
		if (parsed.pathname.includes("/shorts/")) {
			parsed.search = "";
			return parsed.toString();
		}
		const videoId = parsed.searchParams.get("v");
		if (!videoId) {
			return null;
		}
		let search = `?v=${encodeURIComponent(videoId)}`;
		if (timestampSeconds != null && timestampSeconds > 0) {
			search += `&t=${Math.floor(timestampSeconds)}`;
		}
		parsed.search = search;
		return parsed.toString();
	} catch {
		return null;
	}
}

/**
 * Validate a message for a video recommendation.
 * Maximum 280 characters allowed.
 * Secure pattern: blocks dangerous control characters (null bytes, control chars)
 * but allows normal text, Unicode, emojis, line breaks (\n, \r, \t).
 */
export function validateMessage(message: string): {
	valid: boolean;
	error?: string;
} {
	if (!message || message.trim().length === 0) {
		return { valid: true }; // Empty messages are allowed
	}
	if (message.length > 280) {
		return {
			valid: false,
			error: "Message must be 280 characters or less",
		};
	}
	// Secure pattern: blocks control characters except \t, \n, \r (safe whitespace)
	// Blocks: \x00 (null), \x01-\x08, \x0B-\x0C, \x0E-\x1F (control chars), \x7F (DEL)
	// Allows: \x09 (tab), \x0A (newline), \x0D (carriage return), all Unicode
	const pattern = /^[^\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]{0,280}$/;
	if (!pattern.test(message)) {
		return {
			valid: false,
			error: "Message contains invalid or dangerous characters",
		};
	}
	return { valid: true };
}
