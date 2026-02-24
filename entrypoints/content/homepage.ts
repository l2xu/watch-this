import type { LinkRecommendation, RecommendationWithMeta } from "../../types";
import {
	sendMessage,
	extractVideoId,
	fetchVideoMetadata,
	secondsToMmSs,
	extractTimestampFromUrl,
} from "./utils";
import { createStyleElement } from "./shared-styles";

// Homepage-specific CSS styles
const homepageStyles = `
	#watchthis-section {
		padding: 16px 0;
		margin-bottom: 16px;
		border-bottom: 1px solid var(--yt-spec-10-percent-layer, #e5e5e5);
	}

	#watchthis-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 var(--ytd-rich-grid-gutter, 16px) 16px var(--ytd-rich-grid-gutter, 16px);
		font-family: "Roboto", "Arial", sans-serif;
		cursor: pointer;
		user-select: none;
	}

	#watchthis-header:hover h2 {
		color: var(--yt-spec-text-secondary, #606060);
	}

	#watchthis-header h2 {
		font-size: 20px;
		font-weight: 500;
		color: var(--yt-spec-text-primary, #0f0f0f);
		margin: 0;
		transition: color 0.2s ease;
	}

	#watchthis-header .chevron {
		display: inline-block;
		width: 24px;
		height: 24px;
		transition: transform 0.2s ease;
	}

	#watchthis-header .chevron svg {
		fill: var(--yt-spec-text-primary, #0f0f0f);
	}

	#watchthis-section.collapsed #watchthis-header .chevron {
		transform: rotate(-90deg);
	}

	#watchthis-header .count {
		background: #cc0000;
		color: white;
		padding: 2px 8px;
		border-radius: 12px;
		font-size: 12px;
		font-weight: 500;
	}

	#watchthis-grid {
		display: grid;
		grid-template-columns: repeat(var(--ytd-rich-grid-items-per-row, 4), minmax(0, 1fr));
		gap: var(--ytd-rich-grid-item-margin, 16px);
		padding: 0 var(--ytd-rich-grid-gutter, 16px);
		overflow: hidden;
		transition: max-height 0.3s ease, opacity 0.3s ease;
		max-height: 2000px;
		opacity: 1;
		/* Match YouTube's responsive container constraints */
		max-width: var(--ytd-rich-grid-content-max-width, none);
		margin: 0 auto;
	}

	#watchthis-section.collapsed #watchthis-grid {
		max-height: 0;
		opacity: 0;
		padding-top: 0;
		padding-bottom: 0;
	}

	.watchthis-card {
		display: block;
		text-decoration: none;
		color: inherit;
		cursor: pointer;
		border-radius: 12px;
		overflow: hidden;
		transition: transform 0.2s ease;
		max-width: var(--ytd-rich-grid-item-max-width, none);
	}

	

	

	.watchthis-thumbnail {
		position: relative;
		width: 100%;
		aspect-ratio: 16 / 9;
		background: transparent;
		overflow: hidden;
		border-radius: 12px;
	}

	.watchthis-thumbnail img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.watchthis-badge {
		position: absolute;
		bottom: 8px;
		left: 8px;
		background: rgba(204, 0, 0, 0.9);
		color: white;
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 11px;
		font-weight: 500;
		font-family: "Roboto", "Arial", sans-serif;
		z-index: 1;
	}

	.watchthis-message-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
		opacity: 0;
		transition: opacity 0.2s ease;
		pointer-events: none;
		z-index: 2;
		border-radius: 12px;
	}

	.watchthis-card:hover .watchthis-message-overlay {
		opacity: 1;
	}

	.watchthis-message-text {
		color: white;
		font-size: 14px;
		line-height: 1.5;
		text-align: center;
		max-height: 100%;
		overflow-y: auto;
		margin: 0;
		font-family: "Roboto", "Arial", sans-serif;
	}

	.watchthis-info {
		padding: 12px 4px;
	}

	.watchthis-title {
		font-family: "Roboto", "Arial", sans-serif;
		font-size: 16px;
		font-weight: 500;
		line-height: 22px;
		color: var(--yt-spec-text-primary, #0f0f0f);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		margin-bottom: 4px;
	}

	.watchthis-channel {
		font-family: "Roboto", "Arial", sans-serif;
		font-size: 14px;
		color: var(--yt-spec-text-secondary, #606060);
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.watchthis-empty {
		grid-column: 1 / -1;
		text-align: center;
		padding: 32px 16px;
		color: var(--yt-spec-text-secondary, #606060);
		font-family: "Roboto", "Arial", sans-serif;
		font-size: 14px;
	}
`;

// Create styles for this page
function createStyles(): HTMLStyleElement {
	return createStyleElement("watchthis-styles", homepageStyles);
}

// Create a video card element
function createVideoCard(rec: RecommendationWithMeta): HTMLAnchorElement {
	const card = document.createElement("a");
	card.className = "watchthis-card";
	card.id = `watchthis-item-${rec.id}`;
	card.href = rec.url;

	const sender = rec.expand?.sender?.username || "Unknown";
	const videoId = extractVideoId(rec.url);

	// Use oEmbed thumbnail or fallback to constructed URL
	const thumbnailUrl =
		rec.meta?.thumbnail_url ||
		(videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : "");

	const title = rec.meta?.title || "Loading...";
	const channelName = rec.meta?.author_name || "";

	// Create elements safely using DOM manipulation to prevent XSS
	const thumbnail = document.createElement("div");
	thumbnail.className = "watchthis-thumbnail";

	const img = document.createElement("img");
	img.src = thumbnailUrl;
	img.alt = title;
	img.loading = "lazy";

	thumbnail.appendChild(img);

	// Message overlay (if message exists)
	if (rec.message) {
		const messageOverlay = document.createElement("div");
		messageOverlay.className = "watchthis-message-overlay";

		const messageText = document.createElement("p");
		messageText.className = "watchthis-message-text";
		messageText.textContent = rec.message; // XSS-safe: textContent

		messageOverlay.appendChild(messageText);
		thumbnail.appendChild(messageOverlay);
	}

	const badge = document.createElement("div");
	badge.className = "watchthis-badge";
	const timestamp = extractTimestampFromUrl(rec.url);
	badge.textContent =
		timestamp !== null
			? `From ${sender} | Timestamp ${secondsToMmSs(timestamp)}`
			: `From ${sender}`; // Safe from XSS

	thumbnail.appendChild(badge);

	const info = document.createElement("div");
	info.className = "watchthis-info";

	const titleDiv = document.createElement("div");
	titleDiv.className = "watchthis-title";
	titleDiv.textContent = title; // Safe from XSS

	info.appendChild(titleDiv);

	if (channelName) {
		const channelDiv = document.createElement("div");
		channelDiv.className = "watchthis-channel";
		channelDiv.textContent = channelName; // Safe from XSS
		info.appendChild(channelDiv);
	}

	card.appendChild(thumbnail);
	card.appendChild(info);

	return card;
}

// Create the recommendations section
export async function showRecommendations() {
	// Remove existing section if any
	removeRecommendations();

	// Check auth first
	const authResult = await sendMessage({ type: "checkAuth" });
	if (!authResult.success || !authResult.isAuthenticated) {
		return;
	}

	// Get recommendations
	const result = await sendMessage({ type: "getRecommendations" });
	if (!result.success || !result.recommendations) {
		return;
	}

	const recommendations: LinkRecommendation[] = result.recommendations;

	// Only show unseen recommendations
	const unseenRecommendations = recommendations.filter((r) => !r.seen);

	const hasRecommendations = unseenRecommendations.length > 0;

	// Find YouTube's main content container
	const mainContent = document.querySelector("ytd-rich-grid-renderer");
	if (!mainContent) {
		return;
	}

	// Add styles to the page
	document.head.appendChild(createStyles());

	// Create section container
	const section = document.createElement("div");
	section.id = "watchthis-section";

	// Create header
	const header = document.createElement("div");
	header.id = "watchthis-header";

	// Create chevron icon
	const chevron = document.createElement("span");
	chevron.className = "chevron";
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("viewBox", "0 0 24 24");
	svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
	const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	path.setAttribute(
		"d",
		"M12 15.7l-4.35-4.35 1.05-1.05L12 13.6l3.3-3.3 1.05 1.05z",
	);
	svg.appendChild(path);
	chevron.appendChild(svg);

	// Create title
	const h2 = document.createElement("h2");
	h2.textContent = "Recommended by Friends";

	header.appendChild(chevron);
	header.appendChild(h2);

	// Add count badge if there are recommendations
	if (hasRecommendations) {
		const countBadge = document.createElement("span");
		countBadge.className = "count";
		countBadge.textContent = `${unseenRecommendations.length} new`;
		header.appendChild(countBadge);
	}

	section.appendChild(header);

	// Check saved collapse state
	const isCollapsed = localStorage.getItem("watchthis-collapsed") === "true";
	if (isCollapsed) {
		section.classList.add("collapsed");
	}

	// Toggle collapse on header click
	header.addEventListener("click", () => {
		section.classList.toggle("collapsed");
		const collapsed = section.classList.contains("collapsed");
		localStorage.setItem("watchthis-collapsed", String(collapsed));
	});

	// Create grid
	const grid = document.createElement("div");
	grid.id = "watchthis-grid";
	section.appendChild(grid);

	// Insert section before the main content
	mainContent.parentNode?.insertBefore(section, mainContent);

	// Sync YouTube's grid CSS variables to our section
	const syncGridVariables = () => {
		const ytGrid = document.querySelector(
			"ytd-rich-grid-renderer",
		) as HTMLElement;
		if (ytGrid) {
			const computedStyle = getComputedStyle(ytGrid);
			const itemsPerRow = computedStyle
				.getPropertyValue("--ytd-rich-grid-items-per-row")
				.trim();
			const itemMargin = computedStyle
				.getPropertyValue("--ytd-rich-grid-item-margin")
				.trim();
			const gutter = computedStyle
				.getPropertyValue("--ytd-rich-grid-gutter")
				.trim();

			const contentMaxWidth = computedStyle
				.getPropertyValue("--ytd-rich-grid-content-max-width")
				.trim();
			const itemMaxWidth = computedStyle
				.getPropertyValue("--ytd-rich-grid-item-max-width")
				.trim();

			if (itemsPerRow)
				section.style.setProperty("--ytd-rich-grid-items-per-row", itemsPerRow);
			if (itemMargin)
				section.style.setProperty("--ytd-rich-grid-item-margin", itemMargin);
			if (gutter) section.style.setProperty("--ytd-rich-grid-gutter", gutter);
			if (contentMaxWidth)
				section.style.setProperty(
					"--ytd-rich-grid-content-max-width",
					contentMaxWidth,
				);
			if (itemMaxWidth)
				section.style.setProperty(
					"--ytd-rich-grid-item-max-width",
					itemMaxWidth,
				);
		}
	};

	// Initial sync and observe for changes (YouTube updates these on resize)
	syncGridVariables();
	window.addEventListener("resize", syncGridVariables);

	// Show empty state if no recommendations
	if (!hasRecommendations) {
		const emptyState = document.createElement("div");
		emptyState.className = "watchthis-empty";
		emptyState.textContent =
			"Currently none of your friends have a recommendation for you";
		grid.appendChild(emptyState);
		return;
	}

	// Fetch metadata for all recommendations in parallel
	const recommendationsWithMeta: RecommendationWithMeta[] = await Promise.all(
		unseenRecommendations.map(async (rec) => {
			const meta = await fetchVideoMetadata(rec.url);
			return { ...rec, meta: meta || undefined };
		}),
	);

	// Create cards for each recommendation
	recommendationsWithMeta.forEach((rec) => {
		const card = createVideoCard(rec);

		// Helper: mark as seen and update the grid UI
		const markSeenAndUpdateUi = () => {
			// Fire-and-forget — background script handles the request independently
			sendMessage({ type: "markAsSeen", id: rec.id });

			// Remove the card from the grid
			card.remove();

			// Update the header count
			const remainingCards = grid.querySelectorAll(".watchthis-card").length;
			if (remainingCards === 0) {
				const countSpan = header.querySelector(".count");
				if (countSpan) countSpan.remove();

				const emptyState = document.createElement("div");
				emptyState.className = "watchthis-empty";
				emptyState.textContent =
					"Currently none of your friends have a recommendation for you";
				grid.appendChild(emptyState);
			} else {
				const countSpan = header.querySelector(".count");
				if (countSpan) {
					countSpan.textContent = `${remainingCards} new`;
				}
			}
		};

		// Left click (including Ctrl/Cmd/Shift+click for new tab):
		// Browser handles navigation via href — just fire markAsSeen and update UI.
		card.addEventListener("click", () => {
			markSeenAndUpdateUi();
		});

		// Middle mouse button click → opens in new tab natively via href.
		card.addEventListener("auxclick", (e) => {
			if (e.button === 1) {
				markSeenAndUpdateUi();
			}
		});

		grid.appendChild(card);
	});
}

// Remove the recommendations section
export function removeRecommendations() {
	const section = document.getElementById("watchthis-section");
	if (section) section.remove();

	const styles = document.getElementById("watchthis-styles");
	if (styles) styles.remove();
}
