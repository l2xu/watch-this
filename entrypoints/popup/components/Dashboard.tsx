import React, { useState, useEffect } from "react";
import { logout, deleteAccount, isOAuthUser } from "../../../lib/auth";
import {
	getReceivedRecommendations,
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

type DashboardView = "inbox" | "friends" | "settings";

interface DashboardProps {
	user: User;
	onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
	const [currentView, setCurrentView] = useState<DashboardView>("inbox");

	// State
	const [recommendations, setRecommendations] = useState<
		RecommendationWithMeta[]
	>([]);
	const [unseenCount, setUnseenCount] = useState<number>(0);
	const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
	const [loading, setLoading] = useState(true);
	const [unwatchedCollapsed, setUnwatchedCollapsed] = useState(false);
	const [watchedCollapsed, setWatchedCollapsed] = useState(true);

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
			const [recommendationsResult, incomingResult] = await Promise.all([
				getReceivedRecommendations(),
				getIncomingRequests(),
			]);

			if (
				recommendationsResult.success &&
				recommendationsResult.recommendations
			) {
				// Fetch metadata for all recommendations in parallel
				const recsWithMeta: RecommendationWithMeta[] = await Promise.all(
					recommendationsResult.recommendations.map(async (rec) => {
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
				// Calculate unseen count from recommendations
				setUnseenCount(recsWithMeta.filter((r) => !r.seen).length);
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

	const handleOpenLink = async (recommendation: RecommendationWithMeta) => {
		// Mark as seen FIRST (before opening tab, because popup may close)
		if (!recommendation.seen) {
			// Update UI immediately for responsiveness
			setRecommendations((prev) =>
				prev.map((r) =>
					r.id === recommendation.id ? { ...r, seen: true } : r,
				),
			);
			setUnseenCount((prev) => Math.max(0, prev - 1));
			// Then update in database
			await markAsSeen(recommendation.id);
		}

		// Open link in new tab (this may close the popup)
		openInNewTab(recommendation.url);
	};

	const handleLogout = async () => {
		await logout();
		onLogout();
	};

	const openDonationPage = () => {
		openInNewTab("https://ko-fi.com/Lukasweihrauch");
	};

	const goToInbox = () => setCurrentView("inbox");

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
				<p className="text-sm text-gray-500">Logged in as</p>
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
		</div>
	);

	return (
		<div className="w-96 p-6">
			{/* Main Header - shown on inbox view */}
			{currentView === "inbox" && (
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2">
						<img src="/icon/128.png" alt="WatchThis" className="w-8 h-8" />
						<h1 className="text-2xl font-bold text-gray-800">
							<span className="text-primary-500">Watch</span>This!
						</h1>
					</div>
					<div className="flex items-center gap-1">
						{/* Friends Button */}
						<button
							onClick={() => setCurrentView("friends")}
							className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
							title="Friends"
						>
							<Icon name="friends" className="text-gray-600" />
							{pendingRequestsCount > 0 && (
								<span className="absolute -top-1 -right-1 bg-primary-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">
									{pendingRequestsCount}
								</span>
							)}
						</button>
						{/* Settings Button */}
						<button
							onClick={() => setCurrentView("settings")}
							className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
							title="Settings"
						>
							<Icon name="settings" className="text-gray-600" />
						</button>
					</div>
				</div>
			)}

			{/* Sub-page Header - shown on friends/settings views */}
			{currentView !== "inbox" && (
				<div className="flex items-center gap-3 mb-4">
					<button
						onClick={goToInbox}
						className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
						title="Back to Inbox"
					>
						<Icon name="back" className="text-gray-600" />
					</button>
					<h2 className="text-lg font-semibold text-gray-800">
						{currentView === "friends" ? "Friends" : "Settings"}
					</h2>
				</div>
			)}

			{/* Inbox View Content */}
			{currentView === "inbox" && (
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
						<div className="space-y-4 max-h-80 overflow-y-auto">
							{/* Unwatched Section */}
							{recommendations.filter((r) => !r.seen).length > 0 && (
								<div>
									<button
										onClick={() => setUnwatchedCollapsed(!unwatchedCollapsed)}
										className="flex items-center gap-1 text-sm font-medium text-primary-500 mb-2 hover:text-primary-600 transition-colors"
									>
										<Icon
											name="chevron-down"
											size={4}
											className={`transition-transform ${
												unwatchedCollapsed ? "-rotate-90" : ""
											}`}
										/>
										Unwatched ({recommendations.filter((r) => !r.seen).length})
									</button>
									{!unwatchedCollapsed && (
										<div className="space-y-3">
											{recommendations
												.filter((r) => !r.seen)
												.map((rec) => (
													<div
														key={rec.id}
														onClick={() => handleOpenLink(rec)}
														className="rounded-lg cursor-pointer transition-all hover:bg-gray-50 group"
													>
														{/* Thumbnail */}
														<div className="relative aspect-video rounded-lg overflow-hidden bg-gray-200">
															{rec.thumbnailUrl && (
																<img
																	src={rec.thumbnailUrl}
																	alt={rec.meta?.title || "Video thumbnail"}
																	className="w-full h-full object-cover group-hover:scale-105 transition-transform"
																/>
															)}{" "}
															{/* Message overlay on hover */}
															{rec.message && (
																<div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 backdrop-blur-md bg-black/60 flex items-center justify-center p-4">
																	<p className="text-white text-sm text-center leading-relaxed max-h-full overflow-y-auto">
																		{rec.message}
																	</p>
																</div>
															)}{" "}
															{/* NEW badge */}
															<span className="absolute top-2 left-2 bg-primary-500 text-white text-xs font-semibold px-2 py-0.5 rounded">
																NEW
															</span>
															{/* From badge */}
															<span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
																From:{" "}
																{rec.expand?.sender?.username || "Unknown"}
															</span>
														</div>
														{/* Video info */}
														<div className="py-2">
															<h4 className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight">
																{rec.meta?.title || "Loading..."}
															</h4>
															<p className="text-xs text-gray-500 mt-1 truncate">
																{rec.meta?.author_name || ""}
															</p>
														</div>
													</div>
												))}
										</div>
									)}
								</div>
							)}

							{/* Watched Section */}
							{recommendations.filter((r) => r.seen).length > 0 && (
								<div>
									<button
										onClick={() => setWatchedCollapsed(!watchedCollapsed)}
										className="flex items-center gap-1 text-sm font-medium text-gray-500 mb-2 hover:text-gray-700 transition-colors"
									>
										<Icon
											name="chevron-down"
											size={4}
											className={`transition-transform ${
												watchedCollapsed ? "-rotate-90" : ""
											}`}
										/>
										✓ Watched ({recommendations.filter((r) => r.seen).length})
									</button>
									{!watchedCollapsed && (
										<div className="space-y-3">
											{recommendations
												.filter((r) => r.seen)
												.map((rec) => (
													<div
														key={rec.id}
														onClick={() => handleOpenLink(rec)}
														className="rounded-lg cursor-pointer transition-all hover:bg-gray-50 group opacity-60"
													>
														{/* Thumbnail */}
														<div className="relative aspect-video rounded-lg overflow-hidden bg-gray-200">
															{rec.thumbnailUrl && (
																<img
																	src={rec.thumbnailUrl}
																	alt={rec.meta?.title || "Video thumbnail"}
																	className="w-full h-full object-cover group-hover:scale-105 transition-transform"
																/>
															)}{" "}
															{/* Message overlay on hover */}
															{rec.message && (
																<div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 backdrop-blur-md bg-black/60 flex items-center justify-center p-4">
																	<p className="text-white text-sm text-center leading-relaxed max-h-full overflow-y-auto">
																		{rec.message}
																	</p>
																</div>
															)}{" "}
															{/* From badge */}
															<span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
																From:{" "}
																{rec.expand?.sender?.username || "Unknown"}
															</span>
														</div>
														{/* Video info */}
														<div className="py-2">
															<h4 className="text-sm font-medium text-gray-700 line-clamp-2 leading-tight">
																{rec.meta?.title || "Loading..."}
															</h4>
															<p className="text-xs text-gray-400 mt-1 truncate">
																{rec.meta?.author_name || ""}
															</p>
														</div>
													</div>
												))}
										</div>
									)}
								</div>
							)}
						</div>
					)}
				</div>
			)}

			{/* Friends View Content */}
			{currentView === "friends" && <FriendsList user={user} />}

			{/* Settings View Content */}
			{currentView === "settings" && <SettingsView />}
		</div>
	);
}
