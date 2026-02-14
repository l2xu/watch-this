# WatchThis! - Copilot Instructions

## Project Overview

Marketing landing page for WatchThis! - a browser extension for sharing YouTube videos. Built with Astro 5 and Tailwind CSS v4 as a single-page application with component-based architecture.

## Tech Stack & Key Files

- **Framework**: Astro 5.16+ (static site, file-based routing)
- **Styling**: Tailwind CSS v4 with `@theme` directive in [src/styles/global.css](src/styles/global.css)
- **Icons**: astro-icon with Lucide (UI) and Simple Icons (brands)
- **Components**: Pure Astro components (no React/Vue/Svelte)
- **Layout**: [src/layouts/Layout.astro](src/layouts/Layout.astro) wraps all pages with Navbar + Footer

## Icons with astro-icon

### Icon Packs

Use only these two icon packs to maintain consistency:

- **Lucide** (`lucide:*`) - All UI elements (menu, close, chevron, arrows, globe, heart, download, check, play, etc.)
- **Simple Icons** (`simple-icons:*`) - Brand logos only (YouTube, GitHub, Ko-fi)

### Usage Pattern

Import Icon component in frontmatter and use with icon name:

```astro
---
import { Icon } from "astro-icon/components";
---

<!-- UI icons from Lucide -->
<Icon name="lucide:menu" class="w-6 h-6" />
<Icon name="lucide:chevron-down" class="w-5 h-5 text-gray-600" />

<!-- Brand icons from Simple Icons -->
<Icon name="simple-icons:github" class="w-5 h-5" />
<Icon name="simple-icons:youtube" class="w-5 h-5" />
```

### Common Icons Reference

- Navigation: `lucide:menu`, `lucide:x` (close)
- Actions: `lucide:download`, `lucide:check`, `lucide:heart`
- Arrows: `lucide:arrow-left`, `lucide:chevron-down`
- General: `lucide:globe`, `lucide:play`
- Brands: `simple-icons:github`, `simple-icons:youtube`, `simple-icons:kofi`

### Guidelines

- NEVER use inline SVG - always use Icon component
- Apply Tailwind classes directly to Icon component
- Use consistent sizing: `w-5 h-5` for inline icons, `w-6 h-6` for buttons
- Icons inherit `currentColor` by default

## Architecture Patterns

### Component Structure

Components in [src/components/](src/components/) are self-contained Astro files with three sections:

```astro
---
// Frontmatter: data, imports, logic
const navLinks = [...];
---

<!-- Template: HTML with Astro expressions -->
<nav>{navLinks.map(...)}</nav>

<script>
  // Client-side JS: event handlers, DOM manipulation
  document.getElementById("btn")?.addEventListener("click", ...);
</script>
```

### Page Composition

Pages in [src/pages/](src/pages/) import Layout and compose components:

```astro
import Layout from "../layouts/Layout.astro";
import Hero from "../components/Hero.astro";

<Layout>
  <Hero />
  <Features />
</Layout>
```

### Navigation & Routing

- Single-page feel using hash navigation (`href="/#features"`, `href="/#pricing"`)
- Legal pages (datenschutz, impressum) are separate routes
- Mobile menu uses slide-in drawer with overlay (see [Navbar.astro](src/components/Navbar.astro))

## Internationalization (i18n)

### Language Support

Site supports **English (default)** and **German** with client-side language switching.

### Translation System Architecture

**Centralized Translations**: All content in [src/utils/translations.ts](src/utils/translations.ts)

```typescript
export const translations = {
	hero: {
		title: { en: "...", de: "..." },
		description: { en: "...", de: "..." },
	},
	pricing: {
		/* ... */
	},
	faqs: {
		/* ... */
	},
	footer: {
		/* ... */
	},
};
```

**Storage**: localStorage key `watchthis-lang` (values: `'en'` | `'de'`)

### Implementation Pattern

**Dual-Content Rendering** (Preferred for static content):

```astro
---
import { translations } from '../utils/translations';
const t = translations.hero;
---

<h1 data-lang-en class="...">English Title</h1>
<h1 data-lang-de class="... hidden">{t.title.de}</h1>

<script>
  window.addEventListener('languageChanged', (event) => {
    const { lang } = event.detail;
    // Toggle .hidden class on data-lang-* elements
  });
</script>
```

**Data Attributes**:

- `data-lang-en` - Marks English content
- `data-lang-de` - Marks German content
- `data-lang` - Set on `<html>` element (current language)

**Language Toggle**:

- Component: [src/components/LanguageToggle.astro](src/components/LanguageToggle.astro)
- Location: Navbar top-right
- Dispatches `languageChanged` custom event on change
- All components listen to this event and update visibility

**FOUC Prevention**:
Inline script in [Layout.astro](src/layouts/Layout.astro) `<head>`:

```html
<script is:inline>
	const lang = localStorage.getItem("watchthis-lang") || "en";
	document.documentElement.setAttribute("data-lang", lang);
	if (lang === "de") {
		// Hide English content immediately
		const style = document.createElement("style");
		style.textContent = "[data-lang-en] { display: none !important; }";
		document.head.appendChild(style);
	}
</script>
```

### Adding Translatable Content

1. Add translation key to `translations.ts`
2. Render both language versions with appropriate `data-lang-*` attributes
3. Add `.hidden` class to non-default language
4. Event listener automatically handles toggling (no additional JS needed)

### Guidelines

- **Brand name** "WatchThis!" never translated
- **Store names** (Chrome Web Store, Firefox Add-ons) remain in English
- **Icon labels** don't need translation (use `aria-label` for accessibility)
- Use `hidden` class from Tailwind (not `display: none` inline styles)
- Test content length differences (German often 20-30% longer)

## Styling Conventions

### Tailwind v4 Custom Theme

Theme variables defined in [src/styles/global.css](src/styles/global.css) using `@theme` directive:

```css
@theme {
	--color-primary: #c21c1c;
	--color-primary-hover: #a01717;
	--font-heading: "Roboto", sans-serif;
}
```

Use in components: `class="text-primary bg-primary-hover font-heading"`

### Typography

- All text (including headings): Roboto font family with multiple weights (300, 400, 500, 600, 700)
- Headings: Apply `font-heading` class (Roboto)
- Font files hosted locally in [public/fonts/](public/fonts/)

### Component Styling Patterns

- Long utility class chains on elements (no @apply usage)
- Responsive design: mobile-first breakpoints (`sm:`, `md:`, `lg:`)
- Interactive states: `hover:` prefix for transitions
- Animations: custom CSS classes in global.css (`.mobile-menu`, `.accordion-content`)

### Container Convention

Use `.container` class (defined in global.css) instead of Tailwind's container:

```html
<section class="py-24">
	<div class="container">
		<!-- max-width: 1280px, responsive padding -->
	</div>
</section>
```

## Interactive Components

### Client-side JavaScript

Use inline `<script>` tags in .astro files for DOM manipulation:

```astro
<script>
  const btn = document.getElementById("mobile-menu-btn");
  btn?.addEventListener("click", () => {
    menu?.classList.add("open");
  });
</script>
```

- Always use optional chaining (`?.`) for element access
- Toggle classes defined in global.css for animations
- Lock body scroll when overlays open: `document.body.style.overflow = "hidden"`

### State Management Pattern

For toggles (mobile menu, accordions, language switch):

1. Define CSS transition classes in global.css
2. Add/remove classes via JavaScript
3. Use `open` class convention consistently

## Development Workflow

### Commands

- `npm run dev` - Start dev server at localhost:4321
- `npm run build` - Production build to ./dist/
- `npm run preview` - Preview production build locally
- `npm run deploy` - Build + git commit + push (custom deployment)

### File Organization

- Static assets (images, fonts): [public/](public/) directory
- Components: [src/components/](src/components/) (Hero, Features, Pricing, etc.)
- Styles: Single [src/styles/global.css](src/styles/global.css) file
- Pages: [src/pages/](src/pages/) with .astro extension

## Content & Branding

- Product name: "WatchThis!" (not "Watch This")
- Primary color: Red (#c21c1c)
- Logo: `/logo.png` in public folder
- Business model: Free with donation support (Ko-fi link in Pricing section)
- Languages: English (default) and German with site-wide toggle (see Internationalization section)

## Common Patterns to Follow

- Hash-based section navigation for smooth scrolling
- Mobile-first responsive design with breakpoint classes
- Self-contained components with inline scripts (no external JS files)
- Consistent button styling: `rounded-2xl` not `rounded-lg` for primary CTAs
- Shadow utilities with color variants: `shadow-lg shadow-primary/25`
- Use astro-icon Icon component instead of inline SVG elements
