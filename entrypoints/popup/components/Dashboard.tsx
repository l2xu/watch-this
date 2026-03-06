import React, { useState, useEffect } from "react";
import { logout, deleteAccount, isOAuthUser } from "../../../lib/auth";
import {
	getReceivedRecommendations,
	getSentRecommendations,
	markAsSeen,
} from "../../../lib/recommendations";
import { getIncomingRequests } from "../../../lib/friends";
import {
	fetchVideoMetadata,
	extractVideoId,
	getThumbnailUrl,
} from "../../../lib/youtube";
import type { User, RecommendationWithMeta } from "../../../types";
import { openInNewTab } from "../../../lib/browser";
import FriendsList from "./FriendsList";
import Icon from "./Icon";
import type { IconName } from "./Icon";

type DashboardView =
	| "received"
	| "sent"
	| "notifications"
	| "friends"
	| "settings";

interface DashboardProps {
	user: User;
	onLogout: () => void;
}

const manifest = browser.runtime.getManifest();
const version = manifest.version;

export default function Dashboard({ user, onLogout }: DashboardProps) {
	const [currentView, setCurrentView] = useState<DashboardView>("received");

	// State
	const [recommendations, setRecommendations] = useState<
		RecommendationWithMeta[]
	>([]);
	const [sentRecommendations, setSentRecommendations] = useState<
		RecommendationWithMeta[]
	>([]);
	const [unseenCount, setUnseenCount] = useState<number>(0);
	const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
	const [loading, setLoading] = useState(true);

	// Received view state
	const [seenSectionOpen, setSeenSectionOpen] = useState(false);

	// Delete account state
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [deleteConfirmation, setDeleteConfirmation] = useState("");
	const [deleteLoading, setDeleteLoading] = useState(false);
	const [deleteError, setDeleteError] = useState("");
	const [userIsOAuth, setUserIsOAuth] = useState(false);

	// Load data on mount
	useEffect(() => {
		loadData();
		checkOAuthStatus();
	}, []);

	const checkOAuthStatus = async () => {
		const oauthStatus = await isOAuthUser();
		setUserIsOAuth(oauthStatus);
	};

	const loadData = async () => {
		setLoading(true);

		try {
			const [receivedResult, sentResult, incomingResult] = await Promise.all([
				getReceivedRecommendations(),
				getSentRecommendations(),
				getIncomingRequests(),
			]);

			if (receivedResult.success && receivedResult.recommendations) {
				// Fetch metadata for all received recommendations in parallel
				const recsWithMeta: RecommendationWithMeta[] = await Promise.all(
					receivedResult.recommendations.map(async (rec) => {
						const videoId = extractVideoId(rec.url);
						const meta = await fetchVideoMetadata(rec.url);
						return {
							...rec,
							meta,
							thumbnailUrl: videoId ? getThumbnailUrl(videoId) : undefined,
						};
					}),
				);
				setRecommendations(recsWithMeta);
				setUnseenCount(recsWithMeta.filter((r) => !r.seen).length);
			}
			if (sentResult.success && sentResult.recommendations) {
				// Fetch metadata for all sent recommendations in parallel
				const sentWithMeta: RecommendationWithMeta[] = await Promise.all(
					sentResult.recommendations.map(async (rec) => {
						const videoId = extractVideoId(rec.url);
						const meta = await fetchVideoMetadata(rec.url);
						return {
							...rec,
							meta,
							thumbnailUrl: videoId ? getThumbnailUrl(videoId) : undefined,
						};
					}),
				);
				setSentRecommendations(sentWithMeta);
			}
			if (incomingResult.success && incomingResult.requests) {
				setPendingRequestsCount(incomingResult.requests.length);
			}
		} catch (err) {
			console.error("Load data error:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleOpenGroupedLink = async (group: RecommendationWithMeta[]) => {
		const url = group[0].url;
		const unseenRecs = group.filter((r) => !r.seen);

		if (unseenRecs.length > 0) {
			// Update UI immediately for responsiveness
			setRecommendations((prev) =>
				prev.map((r) =>
					unseenRecs.some((u) => u.id === r.id) ? { ...r, seen: true } : r,
				),
			);
			setUnseenCount((prev) => Math.max(0, prev - unseenRecs.length));
			// Then update in database
			await Promise.all(unseenRecs.map((r) => markAsSeen(r.id)));
		}

		// Open link in new tab (this may close the popup)
		openInNewTab(url);
	};

	const handleLogout = async () => {
		await logout();
		onLogout();
	};

	const openDonationPage = () => {
		openInNewTab("https://ko-fi.com/Lukasweihrauch");
	};

	const goToReceived = () => setCurrentView("received");

	// Handle delete account
	const handleDeleteAccount = async (e: React.FormEvent) => {
		e.preventDefault();

		if (userIsOAuth) {
			if (deleteConfirmation !== "DELETE") {
				setDeleteError("Please type DELETE to confirm");
				return;
			}
		} else {
			if (!deleteConfirmation.trim()) {
				setDeleteError("Please enter your password");
				return;
			}
		}

		setDeleteLoading(true);
		setDeleteError("");

		const result = await deleteAccount(deleteConfirmation, userIsOAuth);

		if (result.success) {
			onLogout();
		} else {
			setDeleteError(result.error || "Failed to delete account");
			setDeleteLoading(false);
		}
	};

	const cancelDeleteAccount = () => {
		setShowDeleteConfirm(false);
		setDeleteConfirmation("");
		setDeleteError("");
	};

	// Settings View
	const SettingsView = () => (
		<div className="space-y-4">
			{/* User Info */}
			<div className="p-4 bg-gray-50 rounded-lg">
				<p className="text-sm text-gray-500">Logged in as </p>
				<p className="font-semibold text-gray-800">{user.username}</p>
			</div>

			{/* Actions */}
			<div className="space-y-3">
				<button
					onClick={handleLogout}
					className="w-full py-2 px-4 bg-primary-500 hover:bg-primary-600 hover:cursor-pointer text-white font-medium rounded-lg transition-colors"
				>
					Logout
				</button>

				{!showDeleteConfirm ? (
					<div className="text-center">
						<button
							onClick={() => setShowDeleteConfirm(true)}
							className="text-xs  hover:text-red-700 underline hover:cursor-pointer italic"
						>
							I want to delete my account
						</button>
					</div>
				) : (
					<div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
						<p className="text-sm text-red-700 font-medium">
							⚠️ This action cannot be undone!
						</p>
						<p className="text-xs text-red-600">
							All your data will be permanently deleted, including your friends,
							recommendations, and account.
						</p>
						<form onSubmit={handleDeleteAccount} className="space-y-2">
							{userIsOAuth ? (
								<input
									type="text"
									value={deleteConfirmation}
									onChange={(e) =>
										setDeleteConfirmation(e.target.value.toUpperCase())
									}
									placeholder="Type DELETE to confirm"
									className="w-full px-3 py-2 text-sm border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
									disabled={deleteLoading}
									autoFocus
								/>
							) : (
								<input
									type="password"
									value={deleteConfirmation}
									onChange={(e) => setDeleteConfirmation(e.target.value)}
									placeholder="Enter your password to confirm"
									className="w-full px-3 py-2 text-sm border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
									disabled={deleteLoading}
									autoFocus
								/>
							)}
							{deleteError && (
								<p className="text-xs text-red-600">{deleteError}</p>
							)}
							<div className="flex gap-2">
								<button
									type="button"
									onClick={cancelDeleteAccount}
									className="flex-1 py-2 px-3 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
									disabled={deleteLoading}
								>
									Cancel
								</button>
								<button
									type="submit"
									className="flex-1 py-2 px-3 text-sm bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
									disabled={deleteLoading}
								>
									{deleteLoading ? "Deleting..." : "Delete Forever"}
								</button>
							</div>
						</form>
					</div>
				)}
			</div>

			{/* Links Section */}
			<div className="pt-4 border-t border-gray-200 space-y-3">
				{/* Icon Links */}
				<div className="flex justify-center gap-4">
					{/* Website */}
					<button
						onClick={() => openInNewTab("https://watch-this.app")}
						className="flex flex-col items-center gap-1 text-gray-600 hover:text-primary-500 transition-colors group"
						title="Visit Website"
					>
						<Icon name="globe" />
						<span className="text-xs">Website</span>
					</button>

					{/* Donation */}
					<button
						onClick={openDonationPage}
						className="flex flex-col items-center gap-1 text-gray-600 hover:text-primary-500 transition-colors group"
						title="Support on Ko-fi"
					>
						<Icon name="heart" />
						<span className="text-xs">Donate</span>
					</button>

					{/* Support Email */}
					<button
						onClick={() => openInNewTab("mailto:watch-this@lukasweihrauch.de")}
						className="flex flex-col items-center gap-1 text-gray-600 hover:text-primary-500 transition-colors group"
						title="Email Support"
					>
						<Icon name="mail" />
						<span className="text-xs">Support</span>
					</button>
				</div>
			</div>
			<div className="text-center text-xs text-gray-500 mt-4">
				Version {version}
			</div>
		</div>
	);

	return (
		<div className="w-96 p-6">
			{/* Header - always shown */}
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-2">
					<img src="/icon/128.png" alt="WatchThis" className="w-8 h-8" />
					<h1 className="text-2xl font-bold text-gray-800">
						<span className="text-primary-500">Watch</span>This!
					</h1>
				</div>
				<button
					onClick={() => setCurrentView("settings")}
					className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${currentView === "settings" ? "bg-gray-100 text-primary-500" : "text-gray-600"}`}
					title="Settings"
				>
					<Icon name="settings" />
				</button>
			</div>

			{/* 4-tab navigation */}
			{currentView !== "settings" && (
				<div className="grid grid-cols-4 border border-gray-200 rounded-xl mb-4 overflow-hidden">
					{(
						[
							{
								view: "received",
								icon: "inbox",
								label: "Received",
								badge: unseenCount,
							},
							{ view: "sent", icon: "send", label: "Sent", badge: 0 },
							{
								view: "notifications",
								icon: "bell",
								label: "Alerts",
								badge: 0,
							},
							{
								view: "friends",
								icon: "friends",
								label: "Friends",
								badge: pendingRequestsCount,
							},
						] as {
							view: DashboardView;
							icon: IconName;
							label: string;
							badge: number;
						}[]
					).map(({ view, icon, label, badge }) => (
						<button
							key={view}
							onClick={() => setCurrentView(view)}
							className={`relative flex flex-col items-center gap-0.5 py-2 transition-colors text-xs font-medium ${
								currentView === view
									? "bg-primary-500 text-white"
									: "text-gray-500 hover:bg-gray-50"
							}`}
						>
							{badge > 0 && (
								<span className="absolute top-1 right-2 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full leading-none">
									{badge}
								</span>
							)}
							<Icon name={icon as IconName} size={4} />
							<span>{label}</span>
						</button>
					))}
				</div>
			)}

			{/* Settings sub-page header */}
			{currentView === "settings" && (
				<div className="flex items-center gap-3 mb-4">
					<button
						onClick={goToReceived}
						className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
						title="Back"
					>
						<Icon name="back" className="text-gray-600" />
					</button>
					<h2 className="text-lg font-semibold text-gray-800">Settings</h2>
				</div>
			)}

			{/* Received View */}
			{currentView === "received" && (
				<div>
					<div className="flex items-center justify-between mb-4">
						<h3 className="font-semibold text-gray-800">Received Videos</h3>
						<button
							onClick={loadData}
							className="text-xs text-gray-500 hover:text-gray-700"
						>
							↻ Refresh
						</button>
					</div>

					{loading ? (
						<div className="flex items-center justify-center py-8">
							<div className="text-gray-600">Loading...</div>
						</div>
					) : recommendations.length === 0 ? (
						<p className="text-sm text-gray-500 text-center py-8">
							No recommendations yet
						</p>
					) : (
						(() => {
							const allGroups = Object.values(
								recommendations.reduce(
									(acc, rec) => {
										const key = extractVideoId(rec.url) || rec.url;
										if (!acc[key]) acc[key] = [];
										acc[key].push(rec);
										return acc;
									},
									{} as Record<string, RecommendationWithMeta[]>,
								),
							);
							const unseenGroups = allGroups.filter((g) =>
								g.some((r) => !r.seen),
							);
							const seenGroups = allGroups.filter((g) =>
								g.every((r) => r.seen),
							);

							const renderCard = (group: RecommendationWithMeta[]) => {
								const first = group[0];
								return (
									<div
										key={first.id}
										onClick={() => handleOpenGroupedLink(group)}
										className="rounded-lg cursor-pointer transition-all hover:bg-gray-50 group/card"
									>
										<div className="relative aspect-video rounded-lg overflow-hidden bg-gray-200">
											{first.thumbnailUrl && (
												<img
													src={first.thumbnailUrl}
													alt={first.meta?.title || "Video thumbnail"}
													className="w-full h-full object-cover group-hover/card:scale-105 transition-transform"
												/>
											)}
											{first.message && (
												<div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 backdrop-blur-md bg-black/60 flex items-center justify-center p-4">
													<p className="text-white text-sm text-center leading-relaxed max-h-full overflow-y-auto">
														{first.message}
													</p>
												</div>
											)}
										</div>
										<div className="py-2">
											<h4 className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight">
												{first.meta?.title || "Loading..."}
											</h4>
											<p className="text-xs text-gray-500 mt-1 truncate">
												{first.meta?.author_name || ""}
											</p>
											<div className="flex flex-wrap items-center gap-1 mt-2">
												<span className="text-xs text-gray-400">From:</span>
												{group.map((rec) => (
													<span
														key={rec.id}
														className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"
													>
														{rec.expand?.sender?.username || "Unknown"}
													</span>
												))}
											</div>
										</div>
									</div>
								);
							};

							return (
								<div className="space-y-4 max-h-96 overflow-y-auto">
									{unseenGroups.map(renderCard)}

									{seenGroups.length > 0 && (
										<div>
											<button
												onClick={() => setSeenSectionOpen((o) => !o)}
												className="flex items-center gap-1.5 w-full text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors"
											>
												<span
													className={`transition-transform duration-200 inline-block ${seenSectionOpen ? "rotate-90" : ""}`}
												>
													▶
												</span>
												<span>Watched ({seenGroups.length})</span>
											</button>
											{seenSectionOpen && (
												<div className="space-y-4 mt-2">
													{seenGroups.map(renderCard)}
												</div>
											)}
										</div>
									)}
								</div>
							);
						})()
					)}
				</div>
			)}

			{/* Friends View Content */}
			{currentView === "friends" && <FriendsList user={user} />}

			{/* Sent View */}
			{currentView === "sent" && (
				<div>
					<div className="flex items-center justify-between mb-4">
						<h3 className="font-semibold text-gray-800">Sent Videos</h3>
						<button
							onClick={loadData}
							className="text-xs text-gray-500 hover:text-gray-700"
						>
							↻ Refresh
						</button>
					</div>
					{loading ? (
						<div className="flex items-center justify-center py-8">
							<div className="text-gray-600">Loading...</div>
						</div>
					) : sentRecommendations.length === 0 ? (
						<p className="text-sm text-gray-500 text-center py-8">
							No sent videos yet
						</p>
					) : (
						<div className="space-y-4 max-h-96 overflow-y-auto">
							{Object.values(
								sentRecommendations.reduce(
									(acc, rec) => {
										const key = extractVideoId(rec.url) || rec.url;
										if (!acc[key]) acc[key] = [];
										acc[key].push(rec);
										return acc;
									},
									{} as Record<string, RecommendationWithMeta[]>,
								),
							).map((group) => {
								const first = group[0];
								return (
									<div
										key={first.id}
										onClick={() => openInNewTab(first.url)}
										className="rounded-lg cursor-pointer transition-all hover:bg-gray-50 group/card"
									>
										<div className="relative aspect-video rounded-lg overflow-hidden bg-gray-200">
											{first.thumbnailUrl && (
												<img
													src={first.thumbnailUrl}
													alt={first.meta?.title || "Video thumbnail"}
													className="w-full h-full object-cover group-hover/card:scale-105 transition-transform"
												/>
											)}
											{first.message && (
												<div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 backdrop-blur-md bg-black/60 flex items-center justify-center p-4">
													<p className="text-white text-sm text-center leading-relaxed max-h-full overflow-y-auto">
														{first.message}
													</p>
												</div>
											)}
										</div>
										<div className="py-2">
											<h4 className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight">
												{first.meta?.title || "Loading..."}
											</h4>
											<p className="text-xs text-gray-500 mt-1 truncate">
												{first.meta?.author_name || ""}
											</p>
											<div className="flex flex-wrap items-center gap-1 mt-2">
												<span className="text-xs text-gray-400">To:</span>
												{group.map((rec) => (
													<span
														key={rec.id}
														className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"
													>
														{rec.expand?.receiver?.username || "Unknown"}
													</span>
												))}
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			)}

			{/* Notifications View */}
			{currentView === "notifications" && (
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<Icon name="bell" size={10} className="text-gray-300 mb-4" />
					<p className="text-sm font-medium text-gray-500">
						Notifications coming soon
					</p>
					<p className="text-xs text-gray-400 mt-1">Stay tuned for updates!</p>
				</div>
			)}

			{/* Settings View Content */}
			{currentView === "settings" && <SettingsView />}
		</div>
	);
}
