import { getAuthState } from "../lib/auth";
import {
	getReceivedRecommendations,
	markAsSeen,
	sendRecommendations,
	findRecommendationsByVideoId,
	submitReaction,
} from "../lib/recommendations";
import type { ReactionType } from "../types";
import { getFriends } from "../lib/friends";
import pb from "../lib/pocketbase";
import {
	getNotifications,
	markNotificationRead,
	markAllNotificationsRead,
} from "../lib/notifications";

// Message types for communication between content scripts and background
export type BackgroundMessage =
	| { type: "getRecommendations" }
	| { type: "markAsSeen"; id: string }
	| { type: "checkAuth" }
	| { type: "getFriends" }
	| {
			type: "sendRecommendation";
			receiverIds: string[];
			url: string;
			timestampSeconds?: number | null;
			message?: string;
	  }
	| { type: "checkRecommendationForVideo"; videoId: string }
	| {
			type: "submitReaction";
			recommendationIds: string[];
			reaction: ReactionType | "";
	  }
	| { type: "getNotifications" }
	| { type: "markNotificationRead"; id: string }
	| { type: "markAllNotificationsRead" };

// Standard response type
type MessageResponse<T = unknown> =
	| ({ success: true } & T)
	| { success: false; error: string };

// Helper to wrap handlers that require authentication
async function withAuth<T>(
	handler: () => Promise<T>,
): Promise<MessageResponse<T>> {
	try {
		const authState = await getAuthState();
		if (!authState.isAuthenticated) {
			return { success: false, error: "Not authenticated" };
		}
		const result = await handler();
		return { success: true, ...result } as MessageResponse<T>;
	} catch (error: any) {
		return { success: false, error: error?.message || "Unknown error" };
	}
}

export default defineBackground(() => {
	browser.runtime.onInstalled.addListener((details) => {
		if (details.reason === "install") {
			browser.tabs.create({
				url: "https://watch-this.app/welcome",
				active: true,
			});
		}
	});

	// Listen for messages from content scripts
	browser.runtime.onMessage.addListener(
		(message: BackgroundMessage, _sender, sendResponse) => {
			handleMessage(message).then(sendResponse);
			return true; // Indicate async response
		},
	);
});

async function handleMessage(
	message: BackgroundMessage,
): Promise<MessageResponse<any>> {
	switch (message.type) {
		case "checkAuth": {
			try {
				const authState = await getAuthState();
				return {
					success: true,
					isAuthenticated: authState.isAuthenticated,
					user: authState.user,
				};
			} catch (error: any) {
				return { success: false, error: error?.message || "Auth check failed" };
			}
		}

		case "getRecommendations":
			return withAuth(async () => {
				const result = await getReceivedRecommendations();
				if (!result.success) throw new Error(result.error);
				return { recommendations: result.recommendations };
			});

		case "markAsSeen":
			return withAuth(async () => {
				const result = await markAsSeen(message.id);
				if (!result.success) throw new Error(result.error);
				return {};
			});

		case "getFriends":
			return withAuth(async () => {
				const result = await getFriends();
				if (!result.success) throw new Error(result.error);
				return { friends: result.friends };
			});

		case "sendRecommendation":
			return withAuth(async () => {
				const result = await sendRecommendations(
					message.receiverIds,
					message.url,
					message.timestampSeconds,
					message.message,
				);
				if (!result.success) throw new Error(result.error);
				return { count: result.count };
			});

		case "checkRecommendationForVideo":
			return withAuth(async () => {
				const result = await findRecommendationsByVideoId(message.videoId);
				if (!result.success) throw new Error(result.error);
				return { recommendations: result.recommendations };
			});

		case "submitReaction":
			return withAuth(async () => {
				const result = await submitReaction(
					message.recommendationIds,
					message.reaction,
				);
				if (!result.success) throw new Error(result.error);
				return {};
			});

		case "getNotifications":
			return withAuth(async () => {
				const notifications = await getNotifications();
				return { notifications };
			});

		case "markNotificationRead":
			return withAuth(async () => {
				await markNotificationRead(message.id);
				return {};
			});

		case "markAllNotificationsRead":
			return withAuth(async () => {
				const userId = pb.authStore.model!.id;
				await markAllNotificationsRead(userId);
				return {};
			});

		default:
			return { success: false, error: "Unknown message type" };
	}
}
