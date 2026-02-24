/**
 * Shared CSS styles for WatchThis content scripts
 * These styles are injected into YouTube pages
 */

// Common color variables and theme support
const THEME_COLORS = {
	primary: "#cc0000",
	primaryHover: "#aa0000",
	textPrimary: "var(--yt-spec-text-primary, #0f0f0f)",
	textSecondary: "var(--yt-spec-text-secondary, #606060)",
	baseBackground: "var(--yt-spec-base-background, #fff)",
};

// Shared message styles (success, error, info)
export const messageStyles = `
	.watchthis-message {
		padding: 12px;
		border-radius: 8px;
		margin-bottom: 16px;
		font-size: 14px;
	}

	.watchthis-message-error {
		background: rgba(197, 34, 31, 0.15);
		color: #f28b82;
	}

	html:not([dark]) .watchthis-message-error {
		background: #fce8e6;
		color: #c5221f;
	}

	.watchthis-message-success {
		background: rgba(19, 115, 51, 0.15);
		color: #81c995;
	}

	html:not([dark]) .watchthis-message-success {
		background: #e6f4ea;
		color: #137333;
	}

	.watchthis-message-info {
		background: rgba(255, 255, 255, 0.1);
		color: var(--yt-spec-text-primary, #fff);
	}

	html:not([dark]) .watchthis-message-info {
		background: rgba(0, 0, 0, 0.05);
		color: #0f0f0f;
	}
`;

// Shared button styles
export const buttonStyles = `
	.watchthis-btn {
		padding: 10px 20px;
		border-radius: 18px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		border: none;
		transition: opacity 0.2s ease;
	}

	.watchthis-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.watchthis-btn-primary {
		background: ${THEME_COLORS.primary};
		color: white;
	}

	.watchthis-btn-primary:hover:not(:disabled) {
		background: ${THEME_COLORS.primaryHover};
	}

	.watchthis-btn-secondary {
		background: rgba(255, 255, 255, 0.1);
		color: ${THEME_COLORS.textPrimary};
	}

	html:not([dark]) .watchthis-btn-secondary {
		background: rgba(0, 0, 0, 0.05);
	}

	.watchthis-btn-secondary:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.2);
	}

	html:not([dark]) .watchthis-btn-secondary:hover:not(:disabled) {
		background: rgba(0, 0, 0, 0.1);
	}
`;

// Shared loading styles
export const loadingStyles = `
	.watchthis-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
		color: ${THEME_COLORS.textSecondary};
		font-family: "Roboto", "Arial", sans-serif;
	}

	.watchthis-empty {
		text-align: center;
		padding: 24px;
		color: ${THEME_COLORS.textSecondary};
	}

	.watchthis-empty a {
		color: ${THEME_COLORS.primary};
		text-decoration: none;
	}
`;

// Shared modal styles
export const modalBaseStyles = `
	.watchthis-modal-overlay {
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

	.watchthis-modal {
		background: ${THEME_COLORS.baseBackground};
		border-radius: 12px;
		padding: 24px;
		min-width: 320px;
		max-width: 400px;
		max-height: 80vh;
		overflow-y: auto;
		box-shadow: 0 4px 32px rgba(0, 0, 0, 0.3);
		font-family: "Roboto", "Arial", sans-serif;
	}

	.watchthis-modal h3 {
		margin: 0 0 16px 0;
		font-size: 18px;
		font-weight: 500;
		color: ${THEME_COLORS.textPrimary};
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.watchthis-modal-actions {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
	}
`;

// Shared friend list item styles (used in modal)
export const friendItemStyles = `
	.watchthis-friend-list {
		list-style: none;
		padding: 0;
		margin: 0 0 16px 0;
		max-height: 300px;
		overflow-y: auto;
	}

	.watchthis-friend-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		border-radius: 8px;
		cursor: pointer;
		transition: background 0.2s ease;
		user-select: none;
	}

	.watchthis-friend-item:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	html:not([dark]) .watchthis-friend-item:hover {
		background: rgba(0, 0, 0, 0.05);
	}

	.watchthis-friend-item input[type="checkbox"] {
		width: 18px;
		height: 18px;
		accent-color: ${THEME_COLORS.primary};
		pointer-events: none;
	}

	.watchthis-friend-item label {
		flex: 1;
		cursor: pointer;
		font-size: 14px;
		color: ${THEME_COLORS.textPrimary};
		pointer-events: none;
	}
`;

// Message textarea styles for video modal
export const messageInputStyles = `
	.watchthis-message-section {
		margin: 16px 0;
		padding: 12px 0;
		border-top: 1px solid var(--yt-spec-10-percent-layer, rgba(255, 255, 255, 0.1));
	}

	html:not([dark]) .watchthis-message-section {
		border-top-color: rgba(0, 0, 0, 0.1);
	}

	.watchthis-message-label {
		display: block;
		font-size: 13px;
		color: ${THEME_COLORS.textPrimary};
		margin-bottom: 6px;
		font-weight: 500;
	}

	.watchthis-message-input {
		width: 100%;
		padding: 8px;
		border: 1px solid var(--yt-spec-10-percent-layer, rgba(255, 255, 255, 0.2));
		border-radius: 4px;
		font-size: 13px;
		font-family: "Roboto", "Arial", sans-serif;
		resize: vertical;
		min-height: 60px;
		background: ${THEME_COLORS.baseBackground};
		color: ${THEME_COLORS.textPrimary};
		box-sizing: border-box;
	}

	html:not([dark]) .watchthis-message-input {
		border-color: #ccc;
	}

	.watchthis-message-input:focus {
		outline: none;
		border-color: ${THEME_COLORS.primary};
	}

	.watchthis-char-counter {
		text-align: right;
		font-size: 11px;
		color: ${THEME_COLORS.textSecondary};
		margin-top: 4px;
	}
`;

/**
 * Get all shared styles combined
 */
export function getSharedStyles(): string {
	return `
		${messageStyles}
		${buttonStyles}
		${loadingStyles}
		${modalBaseStyles}
		${friendItemStyles}
		${messageInputStyles}
	`;
}

/**
 * Create a style element with the given CSS content
 */
export function createStyleElement(id: string, css: string): HTMLStyleElement {
	const style = document.createElement("style");
	style.id = id;
	style.textContent = css;
	return style;
}
