# Responsive Foundation Guide (Phase 1)

## Overview

Phase 1 establishes a consistent CSS foundation for mobile-first responsiveness across nev-koder. All future responsive work (Phases 2–4) builds on these utilities and variables.

---

## CSS Variables Reference

### Breakpoints (Mobile-First)
```css
--bp-xs:    320px   /* Extra small phones */
--bp-sm:    480px   /* Small phones to large phones */
--bp-md:    768px   /* Tablets and small notebooks */
--bp-lg:    1024px  /* Medium notebooks */
--bp-xl:    1200px  /* Large notebooks */
--bp-2xl:   1400px  /* Extra large desktop */
```

**Usage in media queries:**
```css
/* Mobile-first: start with base styles */
.component {
  display: block;
}

/* Then add tablet+ changes */
@media (min-width: 768px) {
  .component {
    display: grid;
  }
}

/* Then add desktop+ changes */
@media (min-width: 1024px) {
  .component {
    display: flex;
  }
}
```

---

### Spacing Scale (4px Base)
```css
--space-0:    0
--space-1:    0.25rem  (4px)
--space-2:    0.5rem   (8px)
--space-3:    0.75rem  (12px)
--space-4:    1rem     (16px)
--space-5:    1.25rem  (20px)
--space-6:    1.5rem   (24px)
--space-7:    1.75rem  (28px)
--space-8:    2rem     (32px)
--space-9:    2.25rem  (36px)
--space-10:   2.5rem   (40px)
--space-12:   3rem     (48px)
--space-14:   3.5rem   (56px)
--space-16:   4rem     (64px)
```

**Responsive container/section padding (auto-adjusts by breakpoint):**
```css
--p-container: var(--space-4)  /* 16px mobile → 32px on 1024px+ */
--p-section:   var(--space-6)  /* 24px mobile → 40px on 1024px+ */
--p-large:     var(--space-8)  /* 32px mobile → 48px on 1024px+ */
```

**Usage:**
```css
.container {
  padding: var(--p-container);  /* Automatically responsive */
}

.section {
  padding: var(--p-section);
}

.page-wrapper {
  padding: var(--p-large) var(--p-container);
}
```

---

### Typography Scale (Fluid with clamp())
```css
--fs-xs:    clamp(0.75rem,  1vw,    0.875rem)   /* 12px–14px */
--fs-sm:    clamp(0.875rem, 1.2vw,  0.9375rem)  /* 14px–15px */
--fs-base:  clamp(1rem,     1.5vw,  1rem)       /* 16px */
--fs-lg:    clamp(1.125rem, 2vw,    1.375rem)   /* 18px–22px */
--fs-xl:    clamp(1.5rem,   2.5vw,  1.875rem)   /* 24px–30px */
--fs-2xl:   clamp(1.875rem, 3vw,    2.25rem)    /* 30px–36px */
--fs-3xl:   clamp(2.25rem,  3.5vw,  2.8rem)     /* 36px–45px */
--fs-4xl:   clamp(2.8rem,   4.3vw,  4.1rem)     /* 45px–66px */
```

**Why fluid typography?**
- Uses `clamp()` to scale smoothly between screen sizes
- No jump at breakpoints; continuous scaling
- Best practice for modern responsive design

**Usage:**
```css
h1 {
  font-size: var(--fs-4xl);
}

h3 {
  font-size: var(--fs-2xl);
}

body {
  font-size: var(--fs-base);
  line-height: var(--lh-base);
}
```

**Line heights:**
```css
--lh-tight:   1.2    /* For headings */
--lh-base:    1.5    /* For body text */
--lh-loose:   1.75   /* For readability on long content */
```

---

### Colors
```css
--color-primary:          #006bff
--color-primary-dark:     #0055cc
--color-secondary:        #00d4ff
--color-text-primary:     #334360
--color-text-secondary:   #6b7280
--color-text-light:       #9ca3af
--color-border:           rgba(191, 213, 255, 0.2)
--color-bg-light:         #eef3fb
--color-bg-lighter:       #f6f2f2
```

---

### Layout Constants
```css
--max-width-container:  1280px
--touch-target:         44px        /* WCAG min tap target */
--transition-fast:      150ms ease
--transition-base:      300ms ease
--transition-slow:      500ms ease
```

---

## Responsive Utility Classes

### Container
```css
.container {
  width: 100%;
  max-width: var(--max-width-container);
  margin: 0 auto;
  padding: 0 var(--p-container);
}
```

Use for page-width containers that should never exceed 1280px:
```html
<div class="container">
  <!-- Content automatically responsive and centered -->
</div>
```

---

### Section Spacing
```css
.section {
  padding: var(--p-section) var(--p-container);
}

.section-large {
  padding: var(--p-large) var(--p-container);
}
```

Use to apply consistent padding that adjusts by breakpoint:
```html
<section class="section">
  <h2>Section Title</h2>
  <!-- Content with responsive padding -->
</section>
```

---

### Grid Utilities
```css
.grid-auto {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-6);
}
```

Auto-collapsing grid (good for card layouts):
```html
<div class="grid-auto">
  <div class="card">Card 1</div>
  <div class="card">Card 2</div>
  <div class="card">Card 3</div>
  <!-- Automatically: 1 col on mobile, 2 on tablet, 3+ on desktop -->
</div>
```

---

### Visibility Helpers
```css
.hide-mobile   /* hidden on devices < 768px */
.hide-tablet   /* hidden on 768px–1023px */
.hide-desktop  /* hidden on devices >= 1024px */
```

Example:
```html
<!-- Show desktop nav on 768px+, hide on mobile -->
<nav class="desktop-nav hide-mobile">
  <!-- Desktop navigation -->
</nav>

<!-- Show mobile menu icon on mobile, hide on 768px+ -->
<button class="mobile-menu-btn hide-tablet hide-desktop">
  <!-- Mobile menu button -->
</button>
```

---

### Flexbox Helpers
```css
.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
```

---

## Key Baseline Rules (Phase 1)

### 1. **Overflow Prevention**
- All elements use `box-sizing: border-box` (existing)
- `html`, `body` have `width: 100%` and `overflow-x: hidden`
- No horizontal scrolling unless explicitly intended

### 2. **Responsive Images & Media**
```css
img, picture, video, canvas, svg {
  display: block;
  max-width: 100%;
  height: auto;
}
```

Always use this pattern for images:
```html
<img src="..." alt="..." />
```
Never use fixed `width` + `height` on images intended to be responsive.

### 3. **Touch-Friendly Interactive Elements**
```css
button, a, input[checkbox/radio], select {
  min-height: var(--touch-target);  /* 44px */
}

input[text/email/password/date], textarea, select {
  min-height: var(--touch-target);
  padding: var(--space-2) var(--space-3);
  font-size: var(--fs-base);
}
```

**Rule**: No interactive element should be smaller than 44px × 44px.

### 4. **Responsive Typography Defaults**
- All headings use `clamp()` for smooth scaling
- Base `p` line-height is 1.5 (readability)
- Heading margins scale appropriately

---

## How Responsive Padding Adapts

The `--p-container`, `--p-section`, and `--p-large` variables automatically adjust at breakpoints:

| Variable | <480px | 480–767px | 768–1023px | 1024px+ |
|----------|--------|-----------|------------|---------|
| `--p-container` | 16px | 20px | 24px | 32px |
| `--p-section` | 24px | 24px | 32px | 40px |
| `--p-large` | 32px | 32px | 32px | 48px |

This is set with `@media` queries in `index.css`—no repeated media queries needed per file.

---

## Phase 2–4: Using These Variables

When working on responsive refactors in future phases:

### ✅ DO Use Variables
```css
.component {
  padding: var(--p-container);
  font-size: var(--fs-lg);
  gap: var(--space-4);
  color: var(--color-text-primary);
  max-width: 100%;
}

@media (min-width: 768px) {
  .component {
    display: grid;
  }
}
```

### ❌ DON'T Hardcode Values
```css
/* Avoid: brittle, not responsive */
.component {
  padding: 1rem 2rem;
  font-size: 1.5rem;
  gap: 16px;
  color: #334360;
}
```

---

## Testing the Foundation

After Phase 1 is deployed, verify:

1. **Build succeeds** (no CSS errors)
2. **Layout renders** at all breakpoints (320, 480, 768, 1024, 1200px)
3. **No horizontal scroll** on any screen width
4. **Touch targets** are at least 44 × 44px
5. **Typography** scales smoothly without step jumps

---

## Files Modified in Phase 1

- `client/src/index.css` – Added 50+ CSS variables and baseline responsive rules
- `client/src/App.css` – Updated header/nav to use new variables and responsive breakpoints
- `client/src/RESPONSIVE_FOUNDATION.md` – This guide

---

Next: **Phase 2** will refactor global shell (hero, footer, full-page layouts) to use this foundation.
