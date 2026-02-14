// Translation utilities for WatchThis! site-wide language toggle
// Supports English (default) and German

export type Language = "en" | "de";

export interface Translation {
	en: string;
	de: string;
}

export interface FAQTranslation {
	question: Translation;
	answer: Translation;
}

export interface Translations {
	hero: {
		title: Translation;
		description: Translation;
		ctaChrome: Translation;
		ctaFirefox: Translation;
		installHeading: Translation;
	};
	pricing: {
		heading: Translation;
		description: Translation;
		futureNote: Translation;
		ctaDonate: Translation;
		ctaGithub: Translation;
	};
	faqs: {
		sectionHeading: Translation;
		sectionSubheading: Translation;
		items: FAQTranslation[];
	};
	footer: {
		tagline: Translation;
		copyright: Translation;
		privacyLink: Translation;
		imprintLink: Translation;
	};
}

// Constants
export const LANG_KEY = "watchthis-lang";
export const DEFAULT_LANG: Language = "en";

// Main translation object
export const translations: Translations = {
	hero: {
		title: {
			en: "Recommend YouTube Videos directly to your friends Feed.",
			de: "Empfiehl YouTube-Videos direkt im Feed deiner Freunde.",
		},
		description: {
			en: "Tired of sharing YouTube links through clunky messages? WatchThis! lets you share your favorite videos with a single click, displaying them right on your friends feed for easy access and viewing.",
			de: "Keine Lust mehr auf umständliche Nachrichten mit YouTube-Links? Mit WatchThis! teilst du deine Lieblingsvideos mit einem Klick – sie erscheinen direkt im Feed deiner Freunde.",
		},
		ctaChrome: {
			en: "Chrome Web Store",
			de: "Chrome Web Store",
		},
		ctaFirefox: {
			en: "Firefox Add-ons",
			de: "Firefox Add-ons",
		},
		installHeading: {
			en: "Get the Extension",
			de: "Hol dir die Extension",
		},
	},
	pricing: {
		heading: {
			en: "Community Funded & Open Source",
			de: "Community-finanziert & Open Source",
		},
		description: {
			en: "WatchThis! is completely free to use. I believe great tools should be accessible to everyone. The project is supported by my community through voluntary donations.",
			de: "WatchThis! ist komplett kostenlos. Ich glaube, dass großartige Tools für alle zugänglich sein sollten. Das Projekt wird durch freiwillige Spenden meiner Community unterstützt.",
		},
		futureNote: {
			en: "If community funding is not enough to cover hosting costs, a Pro tier might be introduced in the future — but there will always be a generous free tier!",
			de: "Falls Community-Finanzierung nicht ausreicht, um die Hosting-Kosten zu decken, könnte in Zukunft ein Pro-Tier eingeführt werden – aber es wird immer einen großzügigen kostenlosen Bereich geben!",
		},
		ctaDonate: {
			en: "Support WatchThis! with your donation",
			de: "Unterstütze WatchThis! mit deiner Spende",
		},
		ctaGithub: {
			en: "View on GitHub",
			de: "Auf GitHub ansehen",
		},
	},
	faqs: {
		sectionHeading: {
			en: "Frequently Asked Questions",
			de: "Häufig gestellte Fragen",
		},
		sectionSubheading: {
			en: "Got questions? I have got answers.",
			de: "Fragen? Ich habe Antworten.",
		},
		items: [
			{
				question: {
					en: "How does WatchThis! work?",
					de: "Wie funktioniert WatchThis!?",
				},
				answer: {
					en: "WatchThis! is a simple browser extension that adds a Recommend button to every YouTube video. When you click it, you can select friends from your list, and the video will appear as a recommendation on their YouTube homepage the next time they visit. It is like a personal video suggestion from you!",
					de: "WatchThis! ist eine einfache Browser-Extension, die einen Empfehlen-Button zu jedem YouTube-Video hinzufügt. Wenn du darauf klickst, kannst du Freunde aus deiner Liste auswählen, und das Video erscheint als Empfehlung auf ihrer YouTube-Startseite, wenn sie das nächste Mal YouTube besuchen. Es ist wie eine persönliche Video-Empfehlung von dir!",
				},
			},
			{
				question: {
					en: "Is my data safe and private?",
					de: "Sind meine Daten sicher und geschützt?",
				},
				answer: {
					en: "Absolutely! I take privacy seriously. WatchThis! only stores the minimal data needed to deliver recommendations. I never track your viewing habits, and all data is encrypted. Since it is open-source, you can verify this yourself by checking the code on GitHub.",
					de: "Auf jeden Fall! Ich nehme Datenschutz ernst. WatchThis! speichert nur die minimalen Daten, die für die Bereitstellung von Empfehlungen erforderlich sind. Ich verfolge niemals dein Sehverhalten, und alle Daten sind verschlüsselt. Da es Open Source ist, kannst du dies selbst überprüfen, indem du den Code auf GitHub ansiehst.",
				},
			},
			{
				question: {
					en: "Which browsers are supported?",
					de: "Welche Browser werden unterstützt?",
				},
				answer: {
					en: "WatchThis! currently supports all Chromium-based browsers including Google Chrome, Microsoft Edge, Brave, and Opera. Firefox support is coming soon! Make sure you have the latest version of your browser for the best experience.",
					de: "WatchThis! unterstützt derzeit alle Chromium-basierten Browser, einschließlich Google Chrome, Microsoft Edge, Brave und Opera. Firefox-Unterstützung kommt bald! Stelle sicher, dass du die neueste Version deines Browsers hast, für die beste Erfahrung.",
				},
			},
			{
				question: {
					en: "How do I add friends to share videos with?",
					de: "Wie füge ich Freunde hinzu, um Videos zu teilen?",
				},
				answer: {
					en: "After installing the extension, click the WatchThis! icon in your browser toolbar. You can add friends by sharing a unique invite link with them. Once they accept and install the extension, you will be connected and can start sharing videos instantly!",
					de: "Nach der Installation der Extension klicke auf das WatchThis!-Symbol in deiner Browser-Symbolleiste. Du kannst Freunde hinzufügen, indem du ihnen einen einzigartigen Einladungslink sendest. Sobald sie akzeptieren und die Extension installieren, seid ihr verbunden und könnt sofort Videos teilen!",
				},
			},
		],
	},
	footer: {
		tagline: {
			en: "Share your favorite YouTube videos directly with friends. Free and privacy-focused.",
			de: "Teile deine Lieblings-YouTube-Videos direkt mit Freunden. Kostenlos und datenschutzorientiert.",
		},
		copyright: {
			en: "WatchThis! All rights reserved.",
			de: "WatchThis! Alle Rechte vorbehalten.",
		},
		privacyLink: {
			en: "Privacy Policy",
			de: "Datenschutzerklärung",
		},
		imprintLink: {
			en: "Legal Notice",
			de: "Impressum",
		},
	},
};

// Helper Functions

/**
 * Get saved language preference from localStorage with fallback to default
 */
export function getSavedLanguage(): Language {
	try {
		const saved = localStorage.getItem(LANG_KEY);
		return saved === "en" || saved === "de" ? saved : DEFAULT_LANG;
	} catch {
		// localStorage not available (disabled or server-side)
		return DEFAULT_LANG;
	}
}

/**
 * Save language preference to localStorage and update DOM attribute
 */
export function saveLanguage(lang: Language): void {
	try {
		localStorage.setItem(LANG_KEY, lang);
	} catch {
		console.warn("localStorage not available");
	}
	document.documentElement.setAttribute("data-lang", lang);
}

/**
 * Toggle content visibility based on language
 * Hides opposite language content and shows selected language
 */
export function toggleLanguage(lang: Language): void {
	const oppositeLanguage = lang === "en" ? "de" : "en";

	const elementsToShow = document.querySelectorAll(`[data-lang-${lang}]`);
	const elementsToHide = document.querySelectorAll(
		`[data-lang-${oppositeLanguage}]`,
	);

	elementsToHide.forEach((el) => el.classList.add("hidden"));
	elementsToShow.forEach((el) => el.classList.remove("hidden"));

	// Update FOUC prevention style to match new language
	const foucStyle = document.getElementById("lang-fouc-prevention");
	if (foucStyle) {
		foucStyle.textContent = `[data-lang-${oppositeLanguage}] { display: none !important; }`;
	}
}
