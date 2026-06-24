---
name: The Calm Third Party
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c3c6d7'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#8d90a0'
  outline-variant: '#434655'
  surface-tint: '#b4c5ff'
  primary: '#b4c5ff'
  on-primary: '#002a78'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#0053db'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb3ad'
  on-tertiary: '#68000a'
  tertiary-container: '#cf2c30'
  on-tertiary-container: '#ffecea'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#930013'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-margin: 24px
  gutter: 16px
  widget-padding: 20px
  stack-compact: 8px
  stack-default: 16px
---

## Brand & Style

The design system is engineered for the disciplined crypto trader. It embodies the "Calm Third Party" persona—an objective, analytical partner that remains steady amidst market volatility. The aesthetic is a fusion of **Corporate Modern** precision and **Subtle Glassmorphism**, prioritizing clarity and trust over hype.

The visual language communicates authority through a dark, structured environment. It avoids unnecessary ornamentation, focusing instead on data density and modularity. Every element is designed to reduce cognitive load, allowing users to make rapid, informed decisions based on cold, hard data.

## Colors

The palette is anchored in deep, "Midnight Navy" and "Slate" tones to create a focused, low-strain environment for long trading sessions. 

- **Primary (Electric Blue):** Reserved for AI-driven insights, primary actions, and active states. It represents intelligence and the "future-forward" nature of the platform.
- **Success (Emerald Green):** Used exclusively for gains, upward trends, and completed transactions.
- **Danger (Ruby Red):** Used for losses, downward trends, and critical alerts.
- **Neutral/Surface:** A tiered system of Slates and Navys to create depth without relying on heavy shadows. High-contrast white/light-gray text ensures maximum legibility.

## Typography

This design system utilizes **Inter** for its exceptional legibility and neutral, systematic tone. To accommodate high data density, the type scale is compact and disciplined.

For all financial figures and ticker prices, the `data-mono` style must be used. This leverages Inter's **tabular numerals (tnum)** to ensure that numbers align vertically in columns and tables, preventing visual "jumping" when prices update in real-time. Headlines are tight and authoritative, while labels use subtle tracking and uppercase styling to differentiate them from interactive data points.

## Layout & Spacing

The layout follows a **12-column fluid grid** designed for modularity. Content is housed in discrete "widgets" or tiles that can reflow based on the trader's screen real estate.

- **Desktop:** 12 columns, 24px margins, 16px gutters. Widgets typically span 3, 4, 6, or 12 columns.
- **Tablet:** 8 columns, 16px margins, 12px gutters.
- **Mobile:** 4 columns, 16px margins, 12px gutters.

The spacing rhythm is based on a 4px scale. To achieve high density, we use `stack-compact` for related data points (e.g., a label and its value) and `stack-default` for separating logical sections within a module.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Subtle Glassmorphism** rather than traditional drop shadows.

- **Base Layer:** The darkest navy (`#020617`), representing the "tabletop."
- **Level 1 (Widgets):** Raised surface (`#0F172A`) with a 1px solid border (`#1E293B`).
- **Level 2 (Modals/Popovers):** Semi-transparent background with a backdrop blur (20px) to create a frosted glass effect. This maintains the context of the underlying data while bringing the interaction to the foreground.
- **Active State:** Elements may use a subtle outer glow of the Primary color (Electric Blue) at 10-15% opacity to indicate focus or "live" status.

## Shapes

The shape language is "Soft" (`roundedness: 1`), utilizing a 4px base radius for standard components like input fields and buttons. This provides a professional, precise feel that is more approachable than sharp corners but more serious than highly rounded "bubbly" designs.

Larger containers (Widgets) use an 8px radius (`rounded-lg`) to clearly define the modular boundaries of the dashboard.

## Components

- **Buttons:** Primary buttons are solid Electric Blue with white text. Secondary buttons are "Ghost" style—transparent with a 1px Slate border, turning solid on hover.
- **Data Tables:** High-density rows with a 1px bottom border. Hover states use a subtle highlight (`#1E293B`). Positive values (gains) use Emerald Green text; negative values (losses) use Ruby Red.
- **Value Chips:** Compact indicators for percentage changes. They include a small up/down chevron icon and a low-opacity background tint (e.g., 10% Emerald Green for gains).
- **Input Fields:** Dark slate background with a 1px border. On focus, the border transitions to Electric Blue with a subtle inner glow.
- **AI Insights Cards:** Distinguished by a thin 1px gradient border (Electric Blue to Transparent) and a subtle backdrop blur to signify "automated" or "intelligent" content.
- **Price Charts:** Minimalist line or candlestick charts using the Success/Danger colors. Grid lines are kept to a minimum, using the lowest-contrast Slate.