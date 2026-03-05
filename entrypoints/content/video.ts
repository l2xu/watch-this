import type { User, ReactionType } from "../../types";
import {
	sendMessage,
	secondsToMmSs,
	mmSsToSeconds,
	extractVideoId,
} from "./utils";
import { browser } from "wxt/browser";
import { createStyleElement, getSharedStyles } from "./shared-styles";
import { validateMessage } from "../../lib/validation";

// Video page specific styles
const videoPageStyles = `
	#watchthis-button-wrapper {
		display: inline-flex;
		align-items: center;
		margin-left: 8px;
		flex-shrink: 0;
		vertical-align: middle;
	}

	#watchthis-button {
		background: #cc0000 !important;
		color: white !important;
		border-radius: 50px !important;
		padding: 0 16px !important;
		height: 36px !important;
		border: none !important;
		cursor: pointer !important;
		font-family: "Roboto", "Arial", sans-serif !important;
		font-size: 14px !important;
		font-weight: 500 !important;
		transition: background 0.2s ease !important;
	}

	#watchthis-button:hover {
		background: #aa0000 !important;
	}

	#watchthis-button-icon {
		width: 24px;
		height: 24px;
		object-fit: contain;
	}

	#watchthis-modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.6);
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	#watchthis-modal {
		background: var(--yt-spec-base-background, #fff);
		border-radius: 12px;
		padding: 24px;
		min-width: 320px;
		max-width: 400px;
		max-height: 80vh;
		overflow-y: auto;
		box-shadow: 0 4px 32px rgba(0, 0, 0, 0.3);
		font-family: "Roboto", "Arial", sans-serif;
	}

	#watchthis-modal h3 {
		margin: 0 0 16px 0;
		font-size: 18px;
		font-weight: 500;
		color: var(--yt-spec-text-primary, #0f0f0f);
		display: flex;
		align-items: center;
		gap: 8px;
	}

	#watchthis-modal-close {
		position: absolute;
		top: 12px;
		right: 12px;
		background: none;
		border: none;
		font-size: 24px;
		cursor: pointer;
		color: var(--yt-spec-text-secondary, #606060);
	}

	.watchthis-timestamp-divider {
		height: 1px;
		background: #f2f2f2;
		margin: 16px 0;
	}

	html:not([dark]) .watchthis-timestamp-divider {
		background: #282828;

	}

	.watchthis-timestamp-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		margin-top: 4px;
		border-radius: 8px;
		cursor: pointer;
		transition: background 0.2s ease;
		user-select: none;
	}

	.watchthis-timestamp-row:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	html:not([dark]) .watchthis-timestamp-row:hover {
		background: rgba(0, 0, 0, 0.05);
	}

	.watchthis-timestamp-row input[type="checkbox"] {
		width: 18px;
		height: 18px;
		accent-color: #cc0000;
		pointer-events: none;
		flex-shrink: 0;
	}

	.watchthis-timestamp-label {
		flex: 1;
		font-size: 14px;
		color: var(--yt-spec-text-primary, #0f0f0f);
		user-select: none;
		cursor: pointer;
		pointer-events: none;
	}

	.watchthis-timestamp-input {
		width: 72px;
		padding: 5px 10px;
		border-radius: 6px;
		border: 1px solid var(--yt-spec-10-percent-layer, #ccc);
		background: var(--yt-spec-base-background, #fff);
		color: var(--yt-spec-text-primary, #0f0f0f);
		font-size: 14px;
		font-family: "Roboto", "Arial", sans-serif;
	}

	.watchthis-timestamp-input:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	#watchthis-modal .watchthis-modal-actions {
		margin-top: 20px;
	}

	/* Reaction banner */
	#watchthis-reaction-banner {
		display: flex;
		justify-content: space-between;
		width: 100%;
		box-sizing: border-box;
		background: var(--t7f4f2c6d54836ce0, #fff);
		border-radius: 12px;
		padding: 16px 20px;
		margin: 12px 0;
		font-family: "Roboto", "Arial", sans-serif;
	}

	#watchthis-reaction-banner .watchthis-reaction-intro {
		font-size: 14px;
		color: var(--yt-spec-text-secondary, #606060);
	}

	#watchthis-reaction-banner .watchthis-reaction-senders {
		font-weight: 500;
		color: var(--yt-spec-text-primary, #0f0f0f);
	}

	.watchthis-reaction-status {
		font-size: 12px;
		color: var(--yt-spec-text-secondary, #606060);
		margin-top: 6px;
		min-height: 16px;
	}
`;

// Create styles for the recommend button and modal
function createRecommendButtonStyles(): HTMLStyleElement {
	const combinedStyles = `${videoPageStyles}\n${getSharedStyles()}`;
	return createStyleElement("watchthis-button-styles", combinedStyles);
}

// Create the recommend button element
function createRecommendButton(): HTMLElement {
	const wrapper = document.createElement("yt-button-view-model");
	wrapper.className = "ytd-menu-renderer";
	wrapper.id = "watchthis-button-wrapper";

	wrapper.innerHTML = `
		<button-view-model class="ytSpecButtonViewModelHost style-scope ytd-menu-renderer">
			<button 
				id="watchthis-button"
				class="yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-leading yt-spec-button-shape-next--enable-backdrop-filter-experiment" 
				title="Recommend to friends" 
				aria-label="Recommend this video to friends"
				style="display: inline-flex; align-items: center; gap: 8px;"
			>
				<img id="watchthis-button-icon" src="${browser.runtime.getURL(
					"/icon/white_logo_icon.svg",
				)}" alt="" />
				<div class="yt-spec-button-shape-next__button-text-content">WatchThis!</div>
				<yt-touch-feedback-shape aria-hidden="true" class="yt-spec-touch-feedback-shape yt-spec-touch-feedback-shape--touch-response">
					<div class="yt-spec-touch-feedback-shape__stroke"></div>
					<div class="yt-spec-touch-feedback-shape__fill"></div>
				</yt-touch-feedback-shape>
			</button>
		</button-view-model>
	`;

	return wrapper;
}

// Create and show the recommend modal
async function showRecommendModal() {
	// Remove existing modal if any
	const existingOverlay = document.getElementById("watchthis-modal-overlay");
	if (existingOverlay) existingOverlay.remove();

	// Create overlay
	const overlay = document.createElement("div");
	overlay.id = "watchthis-modal-overlay";

	// Create modal
	const modal = document.createElement("div");
	modal.id = "watchthis-modal";
	modal.innerHTML = `
		<h3>Select your friends</h3>
		<div class="watchthis-loading">Loading friends...</div>
	`;

	overlay.appendChild(modal);
	document.body.appendChild(overlay);

	// Close on overlay click
	overlay.addEventListener("click", (e) => {
		if (e.target === overlay) {
			overlay.remove();
		}
	});

	// Close on Escape key
	const handleEscape = (e: KeyboardEvent) => {
		if (e.key === "Escape") {
			overlay.remove();
			document.removeEventListener("keydown", handleEscape);
		}
	};
	document.addEventListener("keydown", handleEscape);

	// Check auth first
	const authResult = await sendMessage({ type: "checkAuth" });

	if (!authResult.success || !authResult.isAuthenticated) {
		modal.innerHTML = `
			<h3>Select your friends</h3>
			<div class="watchthis-message watchthis-message-info">
				Please log in via the WatchThis extension popup to recommend videos to friends.
			</div>
			<div class="watchthis-modal-actions">
				<button class="watchthis-btn watchthis-btn-secondary" id="watchthis-close-btn">Close</button>
			</div>
		`;
		document
			.getElementById("watchthis-close-btn")
			?.addEventListener("click", () => overlay.remove());
		return;
	}

	// Get friends
	const friendsResult = await sendMessage({ type: "getFriends" });

	if (!friendsResult.success) {
		// Create error message safely
		modal.innerHTML = "";

		const h3 = document.createElement("h3");
		h3.textContent = "Select your friends";

		const errorDiv = document.createElement("div");
		errorDiv.className = "watchthis-message watchthis-message-error";
		errorDiv.textContent = `Failed to load friends: ${friendsResult.error}`; // Safe from XSS

		const actionsDiv = document.createElement("div");
		actionsDiv.className = "watchthis-modal-actions";

		const closeBtn = document.createElement("button");
		closeBtn.className = "watchthis-btn watchthis-btn-secondary";
		closeBtn.id = "watchthis-close-btn";
		closeBtn.textContent = "Close";
		closeBtn.addEventListener("click", () => overlay.remove());

		actionsDiv.appendChild(closeBtn);

		modal.appendChild(h3);
		modal.appendChild(errorDiv);
		modal.appendChild(actionsDiv);
		return;
	}

	const friends: User[] = friendsResult.friends || [];

	if (friends.length === 0) {
		modal.innerHTML = `
			<h3>Select your friends</h3>
			<div class="watchthis-empty">
				You don't have any friends yet.<br>
				Add friends via the extension popup to share videos!
			</div>
			<div class="watchthis-modal-actions">
				<button class="watchthis-btn watchthis-btn-secondary" id="watchthis-close-btn">Close</button>
			</div>
		`;
		document
			.getElementById("watchthis-close-btn")
			?.addEventListener("click", () => overlay.remove());
		return;
	}

	// Show friend list
	const selectedFriends = new Set<string>();

	// Create modal header
	const h3 = document.createElement("h3");
	h3.textContent = "Select your friends";
	modal.innerHTML = ""; // Clear existing content
	modal.appendChild(h3);

	// Create friend list
	const friendList = document.createElement("ul");
	friendList.className = "watchthis-friend-list";

	// Create friend list items safely
	friends.forEach((friend) => {
		const li = document.createElement("li");
		li.className = "watchthis-friend-item";
		li.setAttribute("data-id", friend.id);

		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.id = `friend-${friend.id}`;

		const label = document.createElement("label");
		label.setAttribute("for", `friend-${friend.id}`);
		label.textContent = `@${friend.username}`; // Safe from XSS

		li.appendChild(checkbox);
		li.appendChild(label);
		friendList.appendChild(li);
	});

	modal.appendChild(friendList);

	// Timestamp section
	const videoEl = document.querySelector<HTMLVideoElement>("video");
	const currentSeconds = Math.floor(videoEl?.currentTime ?? 0);

	let timestampCheckbox: HTMLInputElement | null = null;
	let timestampInput: HTMLInputElement | null = null;

	{
		const timestampRow = document.createElement("div");
		timestampRow.className = "watchthis-timestamp-row";

		timestampCheckbox = document.createElement("input");
		timestampCheckbox.type = "checkbox";
		timestampCheckbox.checked = false; // Opt-in

		const timestampLabel = document.createElement("label");
		timestampLabel.className = "watchthis-timestamp-label";
		timestampLabel.textContent = "Timestamp:";

		timestampInput = document.createElement("input");
		timestampInput.type = "text";
		timestampInput.value = secondsToMmSs(currentSeconds);
		timestampInput.className = "watchthis-timestamp-input";
		timestampInput.disabled = true;

		// Clicking anywhere on the row toggles the checkbox (like friend items)
		timestampRow.addEventListener("click", (e) => {
			if (e.target === timestampInput) return;
			timestampCheckbox!.checked = !timestampCheckbox!.checked;
			timestampInput!.disabled = !timestampCheckbox!.checked;
		});

		const timestampDivider = document.createElement("div");
		timestampDivider.className = "watchthis-timestamp-divider";
		modal.appendChild(timestampDivider);

		timestampRow.appendChild(timestampCheckbox);
		timestampRow.appendChild(timestampLabel);
		timestampRow.appendChild(timestampInput);
		modal.appendChild(timestampRow);
	}

	// Message section (optional)
	let messageTextarea: HTMLTextAreaElement | null = null;
	let charCounter: HTMLDivElement | null = null;

	{
		const messageSection = document.createElement("div");
		messageSection.className = "watchthis-message-section";

		const messageLabel = document.createElement("label");
		messageLabel.textContent = "Message (optional):";
		messageLabel.className = "watchthis-message-label";

		messageTextarea = document.createElement("textarea");
		messageTextarea.className = "watchthis-message-input";
		messageTextarea.placeholder = "Add a message... (max. 280 characters)";
		messageTextarea.maxLength = 280;
		messageTextarea.rows = 3;

		charCounter = document.createElement("div");
		charCounter.className = "watchthis-char-counter";
		charCounter.textContent = "0/280";

		// Character counter update
		messageTextarea.addEventListener("input", () => {
			const length = messageTextarea!.value.length;
			charCounter!.textContent = `${length}/280`;
			if (length > 260) {
				charCounter!.style.color = "#cc0000";
			} else {
				charCounter!.style.color = "";
			}
		});

		messageSection.appendChild(messageLabel);
		messageSection.appendChild(messageTextarea);
		messageSection.appendChild(charCounter);
		modal.appendChild(messageSection);
	}

	// Create message div
	const messageDiv = document.createElement("div");
	messageDiv.id = "watchthis-modal-message";
	modal.appendChild(messageDiv);

	// Create action buttons
	const actionsDiv = document.createElement("div");
	actionsDiv.className = "watchthis-modal-actions";

	const cancelBtn = document.createElement("button");
	cancelBtn.className = "watchthis-btn watchthis-btn-secondary";
	cancelBtn.id = "watchthis-cancel-btn";
	cancelBtn.textContent = "Cancel";

	const sendBtn = document.createElement("button");
	sendBtn.className = "watchthis-btn watchthis-btn-primary";
	sendBtn.id = "watchthis-send-btn";
	sendBtn.textContent = "Send";
	sendBtn.disabled = true;

	actionsDiv.appendChild(cancelBtn);
	actionsDiv.appendChild(sendBtn);
	modal.appendChild(actionsDiv);

	// Handle friend selection
	modal.querySelectorAll(".watchthis-friend-item").forEach((item) => {
		const checkbox = item.querySelector(
			"input[type='checkbox']",
		) as HTMLInputElement;
		const friendId = item.getAttribute("data-id")!;

		// Clicking anywhere on the row toggles the checkbox
		item.addEventListener("click", () => {
			checkbox.checked = !checkbox.checked;
			if (checkbox.checked) {
				selectedFriends.add(friendId);
			} else {
				selectedFriends.delete(friendId);
			}
			sendBtn.disabled = selectedFriends.size === 0;
		});
	});

	// Cancel button
	cancelBtn?.addEventListener("click", () => overlay.remove());

	// Send button
	sendBtn?.addEventListener("click", async () => {
		if (selectedFriends.size === 0) return;

		sendBtn.disabled = true;
		sendBtn.textContent = "Sending...";

		// Parse timestamp if the checkbox is active
		let timestampSeconds: number | null = null;
		if (timestampCheckbox?.checked && timestampInput) {
			const parsed = mmSsToSeconds(timestampInput.value);
			if (parsed === null) {
				messageDiv.innerHTML = "";
				const errorDiv = document.createElement("div");
				errorDiv.className = "watchthis-message watchthis-message-error";
				errorDiv.textContent =
					"Invalid timestamp. Please use mm:ss format (e.g. 2:34).";
				messageDiv.appendChild(errorDiv);
				sendBtn.disabled = false;
				sendBtn.textContent = "Send";
				return;
			}
			timestampSeconds = parsed;
		}

		// Get message if provided and validate it
		const message = messageTextarea?.value.trim() || undefined;
		if (message) {
			const validation = validateMessage(message);
			if (!validation.valid) {
				messageDiv.innerHTML = "";
				const errorDiv = document.createElement("div");
				errorDiv.className = "watchthis-message watchthis-message-error";
				errorDiv.textContent = validation.error || "Invalid message";
				messageDiv.appendChild(errorDiv);
				sendBtn.disabled = false;
				sendBtn.textContent = "Send";
				return;
			}
		}

		const result = await sendMessage({
			type: "sendRecommendation",
			receiverIds: Array.from(selectedFriends),
			url: window.location.href,
			timestampSeconds,
			message,
		});

		if (result.success) {
			if (messageDiv) {
				// Create success message safely
				messageDiv.innerHTML = "";
				const successDiv = document.createElement("div");
				successDiv.className = "watchthis-message watchthis-message-success";
				successDiv.textContent = `✓ Sent to ${result.count} friend${result.count > 1 ? "s" : ""}!`;
				messageDiv.appendChild(successDiv);
			}
			setTimeout(() => overlay.remove(), 1500);
		} else {
			if (messageDiv) {
				// Create error message safely
				messageDiv.innerHTML = "";
				const errorDiv = document.createElement("div");
				errorDiv.className = "watchthis-message watchthis-message-error";
				errorDiv.textContent = result.error || "Failed to send recommendation"; // Safe from XSS
				messageDiv.appendChild(errorDiv);
			}
			sendBtn.disabled = false;
			sendBtn.textContent = "Send";
		}
	});
}

// Inject the recommend button into YouTube's actions section (right side)
// Returns true if injection was successful, false otherwise
export function injectRecommendButton(): boolean {
	// Don't inject if already exists
	if (document.getElementById("watchthis-button-wrapper")) {
		return true; // Already exists, consider it a success
	}

	// Find YouTube's actions container
	const actionsContainer = document.querySelector("#actions");
	if (!actionsContainer) {
		return false; // Container not found, retry needed
	}

	// Look for the nested buttons container (where buttons are actually in a row)
	const buttonsContainer = actionsContainer.querySelector(
		"#top-level-buttons-computed",
	);

	if (!buttonsContainer) {
		return false; // Nested container not found yet
	}

	// Add styles if not already added
	if (!document.getElementById("watchthis-button-styles")) {
		document.head.appendChild(createRecommendButtonStyles());
	}

	// Create and inject the button at the end of the buttons row
	const recommendButton = createRecommendButton();
	buttonsContainer.appendChild(recommendButton);

	// Add click handler
	const button = document.getElementById("watchthis-button");
	button?.addEventListener("click", (e) => {
		e.preventDefault();
		e.stopPropagation();
		showRecommendModal();
	});

	return true; // Injection successful
}

// Remove the recommend button
export function removeRecommendButton() {
	const button = document.getElementById("watchthis-button-wrapper");
	if (button) button.remove();
}

// ─── Reaction Banner ───────────────────────────────────────────────────────────

// Keep state so the MutationObserver can re-inject with the same data
let _reactionBannerSenderNames: string[] = [];
let _reactionBannerIds: string[] = [];
let _reactionBannerExisting: ReactionType | null = null;
let _reactionBannerObserver: MutationObserver | null = null;
let _likeObserver: MutationObserver | null = null;

function toReactionType(s: string | null): ReactionType | null {
	if (s === "like" || s === "dislike") return s;
	return null;
}

// Remove the reaction banner from the DOM and stop all observing
export function removeReactionBanner() {
	_reactionBannerObserver?.disconnect();
	_reactionBannerObserver = null;
	_likeObserver?.disconnect();
	_likeObserver = null;
	_reactionBannerSenderNames = [];
	_reactionBannerIds = [];
	_reactionBannerExisting = null;
	document.getElementById("watchthis-reaction-banner")?.remove();
}

// Build the banner DOM node (no side effects)
function buildReactionBanner(
	senderNames: string[],
	existingReaction?: ReactionType,
): HTMLElement {
	const banner = document.createElement("div");
	banner.id = "watchthis-reaction-banner";

	// Intro line — build with textContent to stay safe from XSS
	const intro = document.createElement("p");
	intro.className = "watchthis-reaction-intro";

	const sendersSpan = document.createElement("span");
	sendersSpan.className = "watchthis-reaction-senders";

	if (senderNames.length === 1) {
		sendersSpan.textContent = `@${senderNames[0]}`;
		intro.appendChild(sendersSpan);
		intro.appendChild(
			document.createTextNode(" recommended this video to you."),
		);
	} else {
		const last = senderNames[senderNames.length - 1];
		const others = senderNames.slice(0, -1);
		sendersSpan.textContent = others.map((n) => `@${n}`).join(", ");
		intro.appendChild(sendersSpan);
			intro.appendChild(document.createTextNode(" and "));
		const lastSpan = document.createElement("span");
		lastSpan.className = "watchthis-reaction-senders";
		lastSpan.textContent = `@${last}`;
		intro.appendChild(lastSpan);
		intro.appendChild(
			document.createTextNode(" recommended this video to you."),
		);
	}

	const status = document.createElement("div");
	status.className = "watchthis-reaction-status";

	banner.appendChild(intro);
	banner.appendChild(status);

	return banner;
}

// Insert the banner as a full-width second row directly after #top-row
// (#top-row contains the channel info + action buttons row)
function injectReactionBanner(
	senderNames: string[],
	existingReaction?: ReactionType,
) {
	document.getElementById("watchthis-reaction-banner")?.remove();

	// Prefer #top-row (whole channel+button row); fall back to #actions parent
	const anchorRow =
		document.querySelector<HTMLElement>("#top-row") ??
		document.querySelector<HTMLElement>("#actions");
	if (!anchorRow?.parentElement) return;

	// Ensure styles are loaded
	if (!document.getElementById("watchthis-button-styles")) {
		document.head.appendChild(createRecommendButtonStyles());
	}

	const banner = buildReactionBanner(senderNames, existingReaction);
	anchorRow.parentElement.insertBefore(banner, anchorRow.nextSibling);

	// Watch the parent so we can re-inject if YouTube removes our banner
	_reactionBannerObserver?.disconnect();
	_reactionBannerObserver = new MutationObserver(() => {
		if (!document.getElementById("watchthis-reaction-banner")) {
			if (_reactionBannerIds.length > 0) {
				injectReactionBanner(
					_reactionBannerSenderNames,
					_reactionBannerExisting ?? undefined,
				);
				// _likeObserver is intentionally NOT restarted here — it was set up
				// once in checkAndInjectReactionBanner and continues observing the
				// like/dislike buttons regardless of banner re-injection.
			}
		}
	});
	_reactionBannerObserver.observe(anchorRow.parentElement, {
		childList: true,
		subtree: false,
	});
}

// Check if the current video was recommended by a friend and show the banner
export async function checkAndInjectReactionBanner() {
	const videoId = extractVideoId(window.location.href);
	if (!videoId) return;

	const result = await sendMessage({
		type: "checkRecommendationForVideo",
		videoId,
	});

	if (
		!result.success ||
		!result.recommendations ||
		result.recommendations.length === 0
	) {
		return;
	}

	const recommendations = result.recommendations as Array<{
		id: string;
		reaction?: string;
		expand?: { sender?: { username?: string } };
	}>;

	const ids = recommendations.map((r) => r.id);
	const senderNames = recommendations
		.map((r) => r.expand?.sender?.username)
		.filter((name): name is string => Boolean(name));

	// Use the reaction from the first record (all share the same reaction)
	const existingReaction = recommendations[0]?.reaction || null;

	// Store so the MutationObserver can re-inject with the same data
	_reactionBannerIds = ids;
	_reactionBannerSenderNames = senderNames;
	_reactionBannerExisting = toReactionType(existingReaction);

	injectReactionBanner(senderNames, toReactionType(existingReaction) ?? undefined);
	attachYouTubeLikeObserver(ids, toReactionType(existingReaction));
}

// Watch YouTube's own like/dislike buttons and sync the result to PocketBase
function attachYouTubeLikeObserver(
	recommendationIds: string[],
	initialReaction: ReactionType | null,
) {
	_likeObserver?.disconnect();
	_likeObserver = null;

	const likeBtn = document.querySelector<HTMLButtonElement>(
		"#top-level-buttons-computed button.yt-spec-button-shape-next--segmented-start[aria-pressed]",
	);
	const dislikeBtn = document.querySelector<HTMLButtonElement>(
		"#top-level-buttons-computed button.yt-spec-button-shape-next--segmented-end[aria-pressed]",
	);

	if (!likeBtn && !dislikeBtn) return;

	const getPressed = (): ReactionType | null => {
		if (likeBtn?.getAttribute("aria-pressed") === "true") return "like";
		if (dislikeBtn?.getAttribute("aria-pressed") === "true") return "dislike";
		return null;
	};

	// Seed from PocketBase so we don't re-save a reaction the user set previously
	let lastSaved: ReactionType | null = initialReaction ?? getPressed();

	_likeObserver = new MutationObserver(async () => {
		const reaction = getPressed();
		// No change compared to last saved state — nothing to do
		if (reaction === lastSaved) return;

		const status = document.querySelector<HTMLElement>(
			"#watchthis-reaction-banner .watchthis-reaction-status",
		);

		// User undid their reaction (both buttons unpressed) → clear in PocketBase
		if (reaction === null) {
			// Only clear if we had previously saved something
			if (lastSaved === null) return;
			lastSaved = null;
			if (status) status.textContent = "Saving…";
			const result = await sendMessage({
				type: "submitReaction",
				recommendationIds,
				reaction: "",
			});
			if (result.success) _reactionBannerExisting = null;
			if (status) {
				status.textContent = result.success
					? "Reaction removed"
					: "Failed to save";
			}
			return;
		}

		// User pressed like or dislike
		lastSaved = reaction;
		if (status) status.textContent = "Saving…";
		const result = await sendMessage({
			type: "submitReaction",
			recommendationIds,
			reaction,
		});
		if (result.success) _reactionBannerExisting = reaction;
		if (status) {
			status.textContent = result.success
				? "✓ Reaction saved"
				: "Failed to save";
		}
	});

	const targets = [likeBtn, dislikeBtn].filter(
		(b): b is HTMLButtonElement => b !== null,
	);
	targets.forEach((btn) => {
		_likeObserver!.observe(btn, {
			attributes: true,
			attributeFilter: ["aria-pressed"],
		});
	});
}
