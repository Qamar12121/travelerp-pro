# Design Brief

**Tone & Purpose**: VIP luxury travel accounting ERP — authoritative, refined, premium dark interface for enterprise financial operations.  
**Differentiation**: Deep black + gold palette with glassmorphism; luxury-focused luxury aesthetic over utilitarian grey.

## Color Palette

| Token | OKLCH | HEX | Purpose |
|-------|-------|-----|---------|
| Background | 0.08 0 0 | #0A0A0A | Primary deep black |
| Card | 0.11 0 0 | #1A1A1A | Surface elevation for cards, sidebar |
| Foreground | 0.95 0 0 | #F2F2F2 | Text on dark backgrounds |
| Accent | 0.65 0.17 81 | #D4AF37 | Gold highlights, active states, KPI borders |
| Destructive | 0.65 0.19 22 | #F23645 | Error, delete actions |
| Chart-1 | 0.65 0.17 81 | #D4AF37 | Gold data visualization |
| Muted-foreground | 0.55 0 0 | #8C8C8C | Secondary text, disabled states |

## Typography

**Display**: Fraunces (serif, headings, premium feel)  
**Body**: Figtree (humanist sans, readable, refined)  
**Mono**: GeistMono (data, ledger entries, code)  
**Hierarchy**: H1 24px bold gold, H2 20px gold, body 14px foreground, caption 12px muted-foreground

## Structural Zones

| Zone | Background | Border | Treatment |
|------|-----------|--------|-----------|
| Sidebar | Card (0.11 0 0) | Subtle divider (border/20) | Fixed left, gold active indicator |
| Topbar | Card (0.11 0 0) | Subtle divider (border/20) | Search + notifications + profile |
| KPI Cards | Glass effect (card/5 blur) | Accent/10 on hover to accent/30 | Gradient border effect in hover state |
| Data Tables | Card (0.11 0 0) rows | Subtle row divider | Hover: soft gold glow (accent/15) |
| Content Background | Background (0.08 0 0) | None | Deep black foundation |
| Modals | Glass-card | Accent/10 | Backdrop blur, elevated on dark background |

## Component Patterns

- **Buttons**: Gold accent (primary CTA), card-colored (secondary), destructive red (delete)
- **Cards**: Glassmorphism — semi-transparent with backdrop-blur, subtle gold borders on hover
- **Input fields**: Dark card background, gold ring on focus, muted placeholder text
- **Tables**: Row hover triggers soft gold glow; alternating subtle row backgrounds
- **Icons**: Gold accent for active/highlighted states, muted-foreground for inactive
- **Badges**: Gold background with dark text for status; card background for secondary

## Motion & Animation

- **Default transition**: 0.3s cubic-bezier(0.4, 0, 0.2, 1) on all interactive elements
- **Hover effects**: Subtle scale (1.02x), gold glow shadow (0 0 30px rgba(212,175,55,0.3))
- **Card interactions**: Border color shift from accent/10 to accent/30, backdrop-blur intensifies

## Spacing & Density

- **Grid**: 12px base unit (48px cards, 36px gaps)
- **Sidebar width**: 260px (collapsible to 64px)
- **Content max-width**: 1600px with 40px padding
- **Border-radius**: 12px minimum (lg/xl throughout), 8px for small inputs, 16px+ for KPI cards

## Constraints

- No raw hex colors — all colors use OKLCH CSS variables
- All interactive elements use `.transition-smooth` (0.3s)
- Glassmorphism only on cards/modals, not full-page backgrounds
- Gold accent limited to: active states, hover effects, primary CTAs, data highlights
- Minimum contrast ratio 4.5:1 dark mode (0.08 background vs 0.95 text)

## Signature Detail

Glassmorphism cards with subtle gold gradient borders activate on hover — distinct from typical corporate dashboards. Gold used sparingly as accent, not wallpaper.
