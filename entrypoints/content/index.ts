import { isYouTubeHomepage, isYouTubeVideoPage } from "./utils";
import { showRecommendations, removeRecommendations } from "./homepage";
import {
	injectRecommendButton,
	removeRecommendButton,
	checkAndInjectReactionBanner,
	removeReactionBanner,
} from "./video";

// State tracking
let isLoadingHomepage = false;
let videoRetryTimer: ReturnType<typeof setTimeout> | null = null;

// Stop video page mechanisms
function cleanupVideoPage() {
	if (videoRetryTimer) {
		clearTimeout(videoRetryTimer);
		videoRetryTimer = null;
	}
	removeRecommendButton();
	removeReactionBanner();
}

// Stop homepage mechanisms
function cleanupHomepage() {
	isLoadingHomepage = false;
	removeRecommendations();
}

// Handle homepage - show recommendations section
async function handleHomepage() {
	// Prevent concurrent loads
	if (isLoadingHomepage) {
		return;
	}

	// Already exists, skip
	if (document.getElementById("watchthis-section")) {
		return;
	}

	isLoadingHomepage = true;

	// Wait for YouTube's grid to appear
	let attempts = 0;
	const maxAttempts = 30;

	const waitForGrid = (): Promise<boolean> => {
		return new Promise((resolve) => {
			const check = () => {
				// Abort if no longer on homepage
				if (!isYouTubeHomepage()) {
					resolve(false);
					return;
				}

				const grid = document.querySelector("ytd-rich-grid-renderer");
				if (grid) {
					resolve(true);
					return;
				}

				attempts++;
				if (attempts < maxAttempts) {
					setTimeout(check, 200);
				} else {
					resolve(false);
				}
			};
			check();
		});
	};

	const gridReady = await waitForGrid();

	// Double-check we're still on homepage and section doesn't exist
	if (
		gridReady &&
		isYouTubeHomepage() &&
		!document.getElementById("watchthis-section")
	) {
		await showRecommendations();
	}

	isLoadingHomepage = false;
}

// Handle video page - inject WatchThis button
function handleVideoPage() {
	// Clean up any existing timer
	if (videoRetryTimer) {
		clearTimeout(videoRetryTimer);
		videoRetryTimer = null;
	}

	// Wait for YouTube to finish rendering, then inject if needed
	videoRetryTimer = setTimeout(() => {
		// Button already exists after YouTube finished - nothing to do
		if (document.getElementById("watchthis-button-wrapper")) {
			return;
		}

		const startTime = Date.now();
		const maxTime = 10000; // Stop after 10 seconds

		const tryInject = () => {
			// Stop if no longer on video page
			if (!isYouTubeVideoPage()) {
				return;
			}

			// Try to inject (returns true if successful or already exists)
			if (injectRecommendButton()) {
				// Button injected — also check for a reaction banner
				checkAndInjectReactionBanner();
				return; // Success, stop retrying
			}

			// Not successful yet, retry
			if (Date.now() - startTime < maxTime) {
				videoRetryTimer = setTimeout(tryInject, 100);
			}
		};

		tryInject();
	}, 500); // Wait 500ms for YouTube to finish rendering
}

// Main handler for page state changes
function handlePageState() {
	if (isYouTubeHomepage()) {
		cleanupVideoPage();
		handleHomepage();
	} else if (isYouTubeVideoPage()) {
		cleanupHomepage();
		// Don't cleanup video page - just ensure button exists
		handleVideoPage();
	} else {
		cleanupVideoPage();
		cleanupHomepage();
	}
}

export default defineContentScript({
	matches: ["*://*.youtube.com/*"],
	runAt: "document_idle",
	main() {
		// Handle initial page load
		handlePageState();

		// Listen for YouTube SPA navigation events
		window.addEventListener("yt-navigate-finish", handlePageState);
		// window.addEventListener("yt-page-data-updated", handlePageState);

		// Browser back/forward
		window.addEventListener("popstate", () => {
			setTimeout(handlePageState, 50);
		});
	},
});
