## What changed

Implemented the responsive composition of the scroll-driven rocket journey for phones and small screens (below 720px), along with the full rocket journey feature it depends on.

### Rocket journey (desktop base)
- **HTML**: Full one-page showcase portfolio with hero, About, Work, Writing, Experience, and Contact sections, plus a fixed decorative launch scene (stars, moon, clouds, ground, launchpad, gantry, trajectory, rocket), progress bar, telemetry panel, and footer
- **CSS**: Retro NASA-poster visual language with Bebas Neue, Archivo, IBM Plex Mono typography; fixed scene behind scrolling cards; parallax layers; progress bar; telemetry panel hidden below 900px
- **TypeScript**: Cubic Bézier flight path from launchpad to moon driven by scroll progress with smoothstep easing, rAF lerp loop, trail rendering, parallax transforms, telemetry readout, header contrast switching, scroll-spy nav highlighting, and resize-aware anchor measurement

### Phone / small screen composition (<720px) — issue #9
| Asset | Desktop | ≤720px |
|---|---|---|
| **Cards** | Left-aligned, full width | Inset to 65% width, right-aligned (leaves right-hand gutter) |
| **Moon** | 180px at right | 120px, shifted right toward gutter |
| **Rocket** | 40×70px | 30×52px |
| **Launchpad** | Left side of scene | Right side (gutter) |
| **Gantry** | Visible | Hidden |
| **Trajectory** | Dashed full + solid trail | Hidden (prevent stray vertical line) |
| **Telemetry** | Bottom-right panel | Hidden |
| **Header nav** | Full link row | Wordmark only (nav hidden) |
| **Stats grid** | 4 columns | 2 columns |

The rocket's end anchor is measured from layout and repositioned to the right-hand gutter on narrow screens so it finishes beside the contact card. Hero and footer padding are adjusted to prevent clipping. The desktop composition is unchanged.

### Acceptance criteria coverage
- [x] At 390×844 the cards leave a visible right-hand gutter (65% card width, right-aligned)
- [x] The rocket remains visible during ascent and finishes beside the contact card, not behind it
- [x] No stray vertical trail line on phones (trajectory overlay hidden)
- [x] Hero, header and footer fit without clipping
- [x] Around 720px the layout switches without overlap or clipping
- [x] Desktop composition unchanged (media queries only target ≤720px)
- [x] `npm run build` passes

### What a reviewer should check
1. Open the page on desktop (1440×900) — the rocket should rest on the launchpad and fly to the moon as you scroll
2. Resize to 390×844 — cards should be inset to the left, rocket/gutter on the right, gantry and trajectory hidden
3. At exactly 720px width — the layout should switch cleanly without overlapping elements
4. Scroll to the bottom — the rocket should finish beside the contact card, not behind it
5. `npm run build` succeeds with no TypeScript errors

Closes #9

_This pull request was opened by an AI agent (OpenHands)._