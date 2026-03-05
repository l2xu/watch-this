import type { RecordModel } from "pocketbase";

// User type from PocketBase
export interface User extends RecordModel {
	email: string;
	username: string;
	verified: boolean;
	onboarding_completed: boolean;
}

// Auth state type
export interface AuthState {
	isAuthenticated: boolean;
	user: User | null;
	token: string | null;
}

// Friend request status
export type FriendRequestStatus = "pending" | "accepted" | "rejected";

// Friend request type from PocketBase
export interface FriendRequest extends RecordModel {
	sender: string;
	receiver: string;
	status: FriendRequestStatus;
	// Expanded relations (when using expand parameter)
	expand?: {
		sender?: User;
		receiver?: User;
	};
}

// Reaction options for video feedback
export type ReactionType = "like" | "dislike";

// Link recommendation type from PocketBase
export interface LinkRecommendation extends RecordModel {
	sender: string;
	receiver: string;
	url: string;
	seen: boolean;
	message?: string;
	reaction?: ReactionType | "";
	// Expanded relations (when using expand parameter)
	expand?: {
		sender?: User;
		receiver?: User;
	};
}

// oEmbed response data from YouTube API
export interface OEmbedData {
	title: string;
	author_name: string;
	author_url: string;
	thumbnail_url: string;
}

// Extended recommendation type with video metadata
export interface RecommendationWithMeta extends LinkRecommendation {
	meta?: OEmbedData | null;
	thumbnailUrl?: string;
}
