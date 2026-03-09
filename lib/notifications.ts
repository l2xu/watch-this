import pb from "./pocketbase";
import { fetchVideoMetadata, extractVideoId, getThumbnailUrl } from "./youtube";
import type { Notification, NotificationWithMeta } from "../types";

export async function getNotifications(): Promise<NotificationWithMeta[]> {
	const currentUser = pb.authStore.model;
	if (!currentUser) return [];

	const records = await pb
		.collection("notifications")
		.getList<Notification>(1, 50, {
			filter: `recipient = "${currentUser.id}" && read = false`,
			expand: "recommendation,recommendation.receiver",
			sort: "-created",
		});

	const enriched: NotificationWithMeta[] = await Promise.all(
		records.items.map(async (n) => {
			const url = n.expand?.recommendation?.url;
			if (!url) return n;
			const meta = await fetchVideoMetadata(url);
			const videoId = extractVideoId(url);
			return {
				...n,
				meta,
				thumbnailUrl: videoId ? getThumbnailUrl(videoId) : undefined,
			};
		}),
	);

	return enriched;
}

export async function markNotificationRead(id: string): Promise<void> {
	await pb.collection("notifications").update(id, { read: true });
}

export async function deleteNotification(id: string): Promise<void> {
	await pb.collection("notifications").delete(id);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
	const unread = await pb
		.collection("notifications")
		.getFullList<Notification>({
			filter: `recipient = "${userId}" && read = false`,
			fields: "id",
		});
	await Promise.all(
		unread.map((n) =>
			pb.collection("notifications").update(n.id, { read: true }),
		),
	);
}

export async function deleteAllNotifications(userId: string): Promise<void> {
	const all = await pb.collection("notifications").getFullList<Notification>({
		filter: `recipient = "${userId}"`,
		fields: "id",
	});
	await Promise.all(
		all.map((n) => pb.collection("notifications").delete(n.id)),
	);
}

export async function getUnreadCount(userId: string): Promise<number> {
	const result = await pb.collection("notifications").getList(1, 1, {
		filter: `recipient = "${userId}" && read = false`,
	});
	return result.totalItems;
}
