# WatchThis! - Copilot Instructions

## Project Overview

Marketing landing page for WatchThis! - a browser extension for sharing YouTube videos. Built with Astro 5 and Tailwind CSS v4 as a single-page application with component-based architecture.

## Tech Stack & Key Files

- **Framework**: Astro 5.16+ (static site, file-based routing)
- **Styling**: Tailwind CSS v4 with `@theme` directive in [src/styles/global.css](src/styles/global.css)
- **Components**: Pure Astro components (no React/Vue/Svelte)
- **Layout**: [src/layouts/Layout.astro](src/layouts/Layout.astro) wraps all pages with Navbar + Footer

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
- Legal: Dual-language toggle on datenschutz/impressum pages (German/English)

## Common Patterns to Follow

- Hash-based section navigation for smooth scrolling
- Mobile-first responsive design with breakpoint classes
- Self-contained components with inline scripts (no external JS files)
- Consistent button styling: `rounded-2xl` not `rounded-lg` for primary CTAs
- Shadow utilities with color variants: `shadow-lg shadow-primary/25`
