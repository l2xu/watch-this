import pb from "./pocketbase";
import { sanitizeYouTubeUrl, validateMessage } from "./validation";
import { extractVideoId } from "./youtube";
import type { User, LinkRecommendation, ReactionType } from "../types";

/**
 * Check if a URL is a valid YouTube video or shorts URL
 * Valid formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://youtube.com/shorts/VIDEO_ID
 */
export function isValidYouTubeUrl(url: string): boolean {
	if (!url) return false;
	const pattern =
		/^https?:\/\/(www\.)?youtube\.com\/(watch\?v=|shorts\/)[a-zA-Z0-9_-]+/;
	return pattern.test(url);
}

/**
 * Send a link recommendation to multiple friends
 * Creates one recommendation record per receiver
 */
export async function sendRecommendations(
	receiverIds: string[],
	url: string,
	timestampSeconds?: number | null,
	message?: string,
): Promise<{ success: boolean; count?: number; error?: string }> {
	try {
		const currentUser = pb.authStore.model;
		if (!currentUser) {
			return { success: false, error: "You must be logged in" };
		}

		if (receiverIds.length === 0) {
			return { success: false, error: "Please select at least one friend" };
		}

		if (!url) {
			return { success: false, error: "No URL to share" };
		}

		// Validate message if provided
		if (message) {
			const messageValidation = validateMessage(message);
			if (!messageValidation.valid) {
				return { success: false, error: messageValidation.error };
			}
		}

		// Sanitize and validate the YouTube URL; optionally append timestamp
		const sanitizedUrl = sanitizeYouTubeUrl(url, timestampSeconds);
		if (!sanitizedUrl) {
			return {
				success: false,
				error: "Only YouTube videos and shorts can be shared",
			};
		}

		// Create a recommendation for each selected friend using the sanitized URL
		const promises = receiverIds.map((receiverId) =>
			pb.collection("link_recommendations").create({
				sender: currentUser.id,
				receiver: receiverId,
				url: sanitizedUrl,
				seen: false,
				message: message?.trim() || undefined,
			}),
		);

		await Promise.all(promises);

		return {
			success: true,
			count: receiverIds.length,
		};
	} catch (error: any) {
		return {
			success: false,
			error: error?.message || "Failed to send recommendations",
		};
	}
}

/**
 * Get all recommendations received by the current user
 * Sorted by newest first
 */
export async function getReceivedRecommendations(): Promise<{
	success: boolean;
	recommendations?: LinkRecommendation[];
	error?: string;
}> {
	try {
		const currentUser = pb.authStore.model;
		if (!currentUser) {
			return { success: false, error: "You must be logged in" };
		}

		const result = await pb
			.collection("link_recommendations")
			.getList<LinkRecommendation>(1, 50, {
				filter: `receiver = "${currentUser.id}"`,
				expand: "sender",
				sort: "-created",
			});

		return {
			success: true,
			recommendations: result.items,
		};
	} catch (error: any) {
		return {
			success: false,
			error: error?.message || "Failed to get recommendations",
		};
	}
}

/**
 * Mark a recommendation as seen
 */
export async function markAsSeen(
	recommendationId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		await pb.collection("link_recommendations").update(recommendationId, {
			seen: true,
		});

		return { success: true };
	} catch (error: any) {
		return {
			success: false,
			error: error?.message || "Failed to mark as seen",
		};
	}
}

/**
 * Find all unreacted recommendations for the current user matching a given video ID.
 * Expands the sender relation to show usernames in the reaction banner.
 */
export async function findRecommendationsByVideoId(videoId: string): Promise<{
	success: boolean;
	recommendations?: LinkRecommendation[];
	error?: string;
}> {
	try {
		const currentUser = pb.authStore.model;
		if (!currentUser) {
			return { success: false, error: "You must be logged in" };
		}

		const result = await pb
			.collection("link_recommendations")
			.getList<LinkRecommendation>(1, 100, {
				filter: `receiver = "${currentUser.id}"`,
				expand: "sender",
				sort: "-created",
			});

		const matching = result.items.filter(
			(rec) => extractVideoId(rec.url) === videoId,
		);

		return { success: true, recommendations: matching };
	} catch (error: any) {
		return {
			success: false,
			error: error?.message || "Failed to find recommendations",
		};
	}
}

/**
 * Save a reaction for a recommendation (and all related recommendation IDs
 * if multiple senders recommended the same video).
 */
export async function submitReaction(
	recommendationIds: string[],
	reaction: ReactionType | "",
): Promise<{ success: boolean; error?: string }> {
	try {
		await Promise.all(
			recommendationIds.map((id) =>
				pb.collection("link_recommendations").update(id, { reaction }),
			),
		);
		return { success: true };
	} catch (error: any) {
		return {
			success: false,
			error: error?.message || "Failed to submit reaction",
		};
	}
}
