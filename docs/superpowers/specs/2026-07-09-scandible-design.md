# scandible — Design Spec

**Date:** 2026-07-09
**Status:** Approved (design + review revisions + two deferred decisions) — pending final user re-review
**Type:** Greenfield — single subsystem, single implementation plan

## Goal

A static web app that turns a list of UPC codes into barcodes stacked in a vertical
column and scrolls them continuously past the screen at an adjustable speed, so a
**physical barcode scanner** can read each one off the display in sequence.

## Use Case & Constraints

The primary consumer is a **hardware barcode scanner** pointed at the screen. This drives
several hard requirements:

- Barcodes must render **crisp and high-contrast** (pure black bars on white, sharp edges
  at any scale) so a scanner can lock on.
- Vertical spacing must be **generous enough that only one barcode occupies the scan zone
  at a time** — two barcodes in the scanner's field at once would be ambiguous.
- Scroll speed must be **adjustable live and default slow enough to scan**, because a
  moving barcode is harder to read than a still one (the user accepted continuous motion
  over snap-and-dwell).

## Decisions Log

Settled during brainstorming and fixed for this spec:

| Decision          | Choice                                                                     |
| ----------------- | -------------------------------------------------------------------------- |
| Use case          | Feed a physical barcode scanner off the screen                             |
| Motion model      | Continuous smooth scroll at a customizable speed                           |
| Input methods     | Textarea paste **+** file upload (`.txt`/`.csv`) **+** URL parameter       |
| Barcode symbology | UPC-A only, **lenient** — render what JsBarcode accepts, flag the rest     |
| Playback controls | Play/pause, speed control, restart/jump-to-top, loop-at-end                |
| App layout        | Two modes: setup screen → distraction-free fullscreen play view            |
| Invalid codes     | Flagged in setup; **skipped** in the scroll (only valid barcodes render)   |
| Non-loop end      | Show a **"Finished scrolling {N} barcodes in {X} seconds"** summary screen |
| Stack             | Vite + vanilla TypeScript, JsBarcode for barcodes                          |
| Deployment        | GitHub Actions builds on push to `main` → `actions/deploy-pages`           |

## Tech Stack & Project Files (versions pinned)

Concrete dependency and config surface (added after review — the original spec named
`npm ci`/`npm test`/`npm run build` and imported these libs but never declared them):

- **Runtime dependency:** `jsbarcode` (^3.11.6).
- **Dev dependencies:** `vite` (^5), `typescript` (^5.4), `vitest` (^1.6), `jsdom` (^24).
- **`package.json` scripts:** `"dev": "vite"`, `"build": "vite build"`,
  `"preview": "vite preview"`, `"test": "vitest run"`.
- **`index.html`** — the Vite entry document at repo root: a `<div id="app"></div>` mount
  point and `<script type="module" src="/src/main.ts"></script>`. `main.ts` mounts views
  into `#app`.
- **`tsconfig.json`** — `target: "ES2020"`, `module: "ESNext"`,
  `moduleResolution: "bundler"`, `lib: ["ES2020", "DOM", "DOM.Iterable"]`, `strict: true`,
  `noUnusedLocals`, `noUnusedParameters`.
- **`vite.config.ts`** — `base: '/scandible/'` (GitHub Pages project subpath) **and** the
  Vitest block: `test: { environment: 'jsdom' }` (Vitest reads Vite config, so tests and
  build share one file).

## Architecture Overview

A single-page app with **two modes** toggled by a state flag (no router):

- **Setup mode** — enter UPCs (paste / file / URL), see per-code validation, set the
  default scroll speed and loop toggle, copy a shareable link, then press **Start**.
- **Play mode** — fullscreen: barcodes stacked in one tall column scroll continuously
  upward. A minimal, auto-hiding overlay exposes play/pause, a speed slider, restart, and
  a back button that returns to setup.

`main.ts` owns the mode flag and the app state, mounting either `setupView` or `playView`
into `#app`.

### The Scroll Engine (the crux)

Render every barcode as an inline **SVG** stacked in a single tall container. The sequence
is built **twice** back-to-back into the container. Drive motion with a
**`requestAnimationFrame` loop** that translates the container using
`transform: translateY(-offset)`.

Rationale (recorded so the implementer doesn't second-guess it):

- **rAF + transform over CSS `@keyframes`:** live speed changes are a variable mutation; a
  keyframe animation would have to be torn down and recomputed on every slider move. Pause
  is simply "stop incrementing".
- **transform over native `scrollTop`:** GPU-composited transforms are smoother at
  sub-pixel speeds and avoid scroll-snap/inertia artifacts.
- **SVG over canvas:** crisp bars at any size (scanner readability) and no re-render on
  window resize.

**`contentHeight` is the vertical REPEAT PERIOD, not an element's height.** It is the pixel
distance from copy 1's first barcode to copy 2's first barcode, measured as
`copy2FirstBarcode.getBoundingClientRect().top − copy1FirstBarcode.getBoundingClientRect().top`
(use `getBoundingClientRect`, not `offsetTop`/`offsetHeight`, to keep sub-pixel precision —
integer rounding reintroduces a per-cycle drift). Seamless looping requires that translating
by exactly `contentHeight` maps copy 2 onto copy 1's original position; measuring a single
element's height instead would leave any inter-copy gap (`gap`, trailing margin,
margin-collapse, sub-pixel rounding) unaccounted for and produce a visible hop once per
cycle. `contentHeight` is remeasured on window resize.

**Looping behavior (loop toggle):**

- Both copies are **always built** into the DOM. The second copy is **shown only while
  loop is on**; while loop is off it is `display:none` so it can never appear on screen.
- **Loop ON:** the offset wraps with `offset % contentHeight`, so the seam is never visible
  (copy 2 is already on screen as copy 1 scrolls off).
- **Loop OFF:** copy 2 is hidden and the offset **clamps at `contentHeight`**. At the clamp
  the single visible sequence's last barcode has fully scrolled off the top and the column
  is blank; at that moment the scroller fires `onFinish` and `playView` shows the **finish
  summary screen** (see below) over the blank column — so the end state is an informative
  summary, not a frozen duplicate. (Original spec bug: with copy 2 visible, clamping at
  `contentHeight` froze the viewport on the top of copy 2 = the whole sequence rendered
  again, and copy 2 became visible during the final viewport-height of every non-looping
  scroll — a scanner would re-read the first barcodes. Hiding copy 2 when loop is off is the
  fix.)
- **`setLoop` at runtime is seamless with no DOM rebuild:** both copies always exist, so
  `setLoop(true)` un-hides copy 2 and selects the wrap branch; `setLoop(false)` hides copy 2
  and selects the clamp branch. No offset snapping is needed because the wrap branch always
  keeps offset in `[0, contentHeight)`. Initial mount with `settings.loop === false` starts
  with copy 2 already hidden.

**Frame timing.** The rAF loop derives `deltaMs` as the difference between consecutive rAF
timestamps. To stay robust:

- **First frame:** there is no previous timestamp, so `deltaMs = 0` (no movement that
  frame); the baseline is set on the first frame.
- **Backgrounded-tab / long-stall spikes:** `deltaMs` is **clamped to a 100 ms maximum**
  before use, so returning to a backgrounded tab produces a small step, not a giant jump
  that teleports past barcodes.

**Frame math is a pure function** (`scrollMath.ts`) so it can be unit-tested without a DOM
or animation frames — the rAF loop supplies the (already-clamped) `deltaMs` and applies the
returned offset to the transform.

**Finish summary (non-loop end).** The scroller accumulates `elapsedMs` — the sum of the
applied, clamped `deltaMs` **only on frames where it actually advanced** (i.e. while playing
and not yet at the end), so paused time is excluded. When a non-looping scroll reaches the
end, it fires `onFinish({ count, seconds })` exactly once, where `count` is the number of
barcodes scrolled (= the number of **valid** entries, since invalid ones are skipped) and
`seconds = elapsedMs / 1000` rounded to one decimal. `playView` renders this as a
**"Finished scrolling {count} barcodes in {seconds} seconds"** screen with **Restart** and
**Back** buttons. `onFinish` never fires while loop is on.

## Module / File Structure

Small, single-responsibility modules. Interfaces are concrete signatures so tasks can be
written against them.

### `src/types.ts`

```ts
/** One parsed input entry. */
export interface UpcEntry {
	raw: string; // original token exactly as entered
	value: string; // normalized: raw.trim() with all internal whitespace removed
	valid: boolean; // isRenderableUpc(value) — whether JsBarcode renders it as UPC
}

/** Playback settings, round-tripped through the share URL. */
export interface Settings {
	speedPxPerSec: number; // scroll speed in CSS px per second
	loop: boolean; // wrap at end vs. stop
}

/** Single source of truth for defaults; used to fill Partial<Settings>. */
export const DEFAULT_SETTINGS: Settings = { speedPxPerSec: 60, loop: false };
```

### `src/upc.ts` — input parsing

```ts
/** Split raw text (textarea or file) into cleaned tokens: split on newlines AND
 *  commas, trim each, drop empty tokens. Order and duplicates are preserved. */
export function tokenizeUpcInput(raw: string): string[];

/** Tokenize + normalize + validate. For each token: value = token.trim() with
 *  internal whitespace removed; valid = isRenderableUpc(value). */
export function parseUpcList(raw: string): UpcEntry[];
```

`parseUpcList` is the single consumer that sets `UpcEntry.valid`, and it does so by calling
`isRenderableUpc` from `barcode.ts` — this is the only validation predicate.

### `src/barcode.ts` — JsBarcode wrapper

```ts
/** Predicate: does JsBarcode accept this value as UPC? Renders into a DETACHED,
 *  namespaced <svg> with displayValue:false, wrapped in try/catch (a bare JsBarcode
 *  call THROWS on invalid input). Returns false on throw. displayValue:false is
 *  required here: displayValue:true triggers canvas text measurement that THROWS
 *  under jsdom, so the predicate must not enable it. */
export function isRenderableUpc(value: string): boolean;

/** Render one VALID entry into a fresh SVG element created with
 *  document.createElementNS('http://www.w3.org/2000/svg','svg')
 *  (NOT createElement('svg'), which yields a wrong-namespace element that renders
 *  nothing in a real browser). Draws the barcode with displayValue:true. Only ever
 *  called for entries where entry.valid === true (the scroller skips invalid ones and
 *  the setup list flags them as text), so there is no placeholder branch. */
export function renderBarcodeSvg(entry: UpcEntry): SVGElement;
```

JsBarcode display options: `format: "upc"`, `displayValue: true`, `lineColor: "#000"`,
`background: "#fff"`, generous `width` (bar module width) and `height`, sensible `margin`
for quiet zones.

### `src/fileInput.ts` — file reading

```ts
/** Read an uploaded .txt/.csv File as text via FileReader. Rejects on read error.
 *  Returned text is fed to upc.tokenizeUpcInput — CSV is treated as plain
 *  comma/newline-separated tokens (no column semantics). */
export function readUpcFile(file: File): Promise<string>;
```

### `src/shareUrl.ts` — URL round-trip

```ts
/** Build "?codes=...&speed=...&loop=..." from raw code strings + settings.
 *  codes are joined with "\n" and encodeURIComponent-wrapped as one value, so
 *  internal commas/whitespace survive. speed is the integer px/sec; loop is 0|1. */
export function encodeShareUrl(codes: string[], settings: Settings): string;

/** Parse location.search into codes + partial settings. Per-parameter leniency,
 *  never throws: a missing/garbled `codes` yields []; `speed` is used only if it
 *  parses to a finite number within the allowed slider range, else omitted; `loop`
 *  is used only if exactly "0" or "1", else omitted. */
export function decodeShareUrl(search: string): { codes: string[]; settings: Partial<Settings> };
```

The "Copy link" button passes `entries.map(e => e.raw)` (all entries, valid and invalid, for
round-trip fidelity) plus current settings. If the resulting URL exceeds ~2000 characters,
setup shows a non-blocking warning that some browsers/servers may truncate it.

### `src/scrollMath.ts` — pure motion math

```ts
/** Advance the scroll offset by one frame. Pure — no DOM, no time source.
 *  deltaMs is MILLISECONDS (already clamped by the caller).
 *  - delta = speedPxPerSec * (deltaMs / 1000)   // px/sec × seconds
 *  - loop:  return (offset + delta) % contentHeight    (seamless wrap)
 *  - !loop: return min(offset + delta, contentHeight)  (clamp at end) */
export function advanceOffset(
	offset: number,
	speedPxPerSec: number,
	deltaMs: number,
	contentHeight: number,
	loop: boolean
): number;

/** True when a non-looping scroll has reached the end (offset >= contentHeight).
 *  Corresponds to a blank end frame (copy 2 hidden), not a frozen duplicate. */
export function isAtEnd(offset: number, contentHeight: number, loop: boolean): boolean;
```

### `src/scroller.ts` — scroll engine

Renders **only the valid entries** (`entries.filter(e => e.valid)`) as a barcode column,
built twice (copy 2 hidden unless loop on), measures `contentHeight` as the repeat period
(see Scroll Engine), runs the rAF loop with clamped `deltaMs`, tracks `elapsedMs`, and
exposes controls:

```ts
export interface Scroller {
	play(): void;
	pause(): void;
	toggle(): void;
	restart(): void; // offset → 0, elapsedMs → 0, clears finished flag, resumes playing
	setSpeed(pxPerSec: number): void;
	setLoop(loop: boolean): void; // toggles copy-2 visibility + wrap/clamp branch
	isPlaying(): boolean;
	destroy(): void; // cancel rAF, remove resize listener
}

/** Mount a scroller into `container` for the given entries + settings.
 *  Only valid entries are rendered. onFinish fires once when a non-looping scroll
 *  reaches the end. */
export function createScroller(
	container: HTMLElement,
	entries: UpcEntry[],
	settings: Settings,
	onFinish?: (summary: { count: number; seconds: number }) => void
): Scroller;
```

The rAF loop computes `deltaMs` (first frame 0; clamped ≤100 ms), accumulates `elapsedMs`
on advancing frames, calls `advanceOffset`, applies `transform: translateY(-offset)`, and
(when loop is off) stops when `isAtEnd` is true — firing `onFinish({ count, seconds })`
once. `restart()` zeroes offset and `elapsedMs`, clears the finished flag, and resumes
playing (so it also restarts from the finish screen). On resize, `contentHeight` is
remeasured and the offset renormalized (`offset % contentHeight` when looping;
`min(offset, contentHeight)` otherwise) so it stays valid.

### `src/setupView.ts` — setup screen

Renders the textarea, file picker, speed control, loop toggle, live validation list (each
entry marked valid/invalid), "Copy link" button (with the long-URL warning), and **Start**
(enabled only when the list has ≥1 **valid** entry). Pre-fills the textarea from
`initial.codes` by joining with `"\n"`.

```ts
export function mountSetupView(
	root: HTMLElement,
	initial: { codes: string[]; settings: Partial<Settings> },
	onStart: (entries: UpcEntry[], settings: Settings) => void
): void;
```

### `src/playView.ts` — play screen

Mounts the scroller full-screen plus an **auto-hiding overlay** (fades out after ~2 s idle,
reappears on pointer move / tap) with play-pause, speed slider, restart, and back. It passes
an `onFinish` handler to `createScroller` that shows a persistent **finish screen** —
"Finished scrolling {count} barcodes in {seconds} seconds" with **Restart**
(`scroller.restart()`, which hides the finish screen and resumes) and **Back** (`onBack`).

```ts
export function mountPlayView(
	root: HTMLElement,
	entries: UpcEntry[], // scroller renders only the valid subset
	settings: Settings,
	onBack: () => void
): void;
```

### `src/main.ts` — entry point

Decodes the URL, merges settings over defaults
(`{ ...DEFAULT_SETTINGS, ...decoded.settings }`), holds the mode flag + current
`UpcEntry[]` + `Settings`, and swaps between `mountSetupView` and `mountPlayView`. On Start
→ play mode. On Back → setup mode, passing `entries.map(e => e.raw)` as `initial.codes` so
the same list and settings are preserved.

### `src/styles.css`

High-contrast theme, large centered barcodes (`max-width: min(90vw, 640px)`), and
**seam-uniform vertical rhythm**: inter-barcode spacing is applied as equal top+bottom
padding per barcode (or a single container `gap`) — never a `margin-bottom` on only the last
item, and no collapsing margins — so the gap at the copy 1 / copy 2 boundary equals the
internal gap and the loop seam is even. Spacing is generous enough that only one barcode is
in the scan zone at once. Also styles the auto-hiding overlay.

## Data Flow

1. **Load:** `main.ts` calls `decodeShareUrl(location.search)`, merges settings over
   `DEFAULT_SETTINGS`. Any codes pre-fill setup. No auto-start — the user reviews first.
2. **Enter:** textarea and file upload both flow through `tokenizeUpcInput` →
   `parseUpcList`. The validation list updates live.
3. **Start:** setup hands the full `UpcEntry[]` + `Settings` to `main.ts`, which mounts
   `playView` → `createScroller`; the scroller renders only the valid subset.
4. **Play:** rAF loop scrolls; overlay controls mutate the live `Scroller`. On a non-looping
   end, the finish screen appears.
5. **Back:** `playView` calls `scroller.destroy()`; `main.ts` remounts setup with
   `initial.codes = entries.map(e => e.raw)` and the current settings preserved.

## Barcode Rendering Details

- Symbology: `format: "upc"` (UPC-A). Lenient — `isRenderableUpc` gates each entry.
- Invalid entries are **flagged in the setup validation list** (as text, so the user sees
  exactly which codes failed) but **skipped in the scroll** — only valid barcodes are
  rendered and scrolled, since a scanner cannot read a placeholder and it would only waste
  scroll time.
- Bars: pure `#000` on `#fff`, generous bar-module width and height, margins for quiet
  zones — tuned for scanner legibility.

## Layout & UX

- **Setup:** vertically stacked — heading, textarea, file picker, speed slider + loop
  toggle, validation list, "Copy link", and Start. Start disabled with a hint when there
  are zero valid entries.
- **Play:** black-on-white fullscreen column, one barcode prominent in the scan zone at a
  time; overlay auto-hides after ~2 s idle and returns on interaction.
- **Finish (loop off):** when the last barcode has scrolled past, a centered screen reads
  "Finished scrolling {N} barcodes in {X} seconds" with **Restart** and **Back** buttons.
- **Speed control:** an `<input type="range">` mapping **linearly** to `speedPxPerSec` with
  `min=10`, `max=5000`, `step=5`, default `60`. The raw px/sec value is what is stored in the
  share URL. These numbers are starting defaults to be tuned against the real scanner.

## Error Handling & Edge Cases

| Situation                          | Behavior                                                          |
| ---------------------------------- | ----------------------------------------------------------------- |
| Empty / all-invalid list           | **Start** disabled, hint shown                                    |
| Unrenderable code                  | Flagged in setup validation list; **skipped** in the scroll       |
| File read failure                  | Inline error message in setup; existing list untouched            |
| Malformed URL param                | Per-param leniency; app opens with whatever parsed (never throws) |
| Very long share URL (>~2000 chars) | Non-blocking truncation warning on Copy link                      |
| Window resize during play          | `contentHeight` remeasured **and offset renormalized**            |
| Backgrounded tab / stall           | `deltaMs` clamped ≤100 ms so no teleport jump                     |

## Testing Strategy (Vitest, jsdom)

Focus unit tests on pure logic, where bugs hide. **jsdom does not perform layout**
(`getBoundingClientRect` returns zeros) and JsBarcode's `displayValue:true` throws under
jsdom, so the DOM-measurement and human-readable-render paths are validated in a real
browser (manual smoke against the built app), not in unit tests.

- `upc.ts` — tokenizer across newlines, commas, mixed whitespace, empty tokens, duplicates,
  order preservation; normalization of `value`.
- `shareUrl.ts` — encode↔decode round-trip; per-param leniency (garbled codes → [];
  out-of-range/NaN speed omitted; non-0/1 loop omitted); never throws.
- `scrollMath.ts` — `advanceOffset` normal step, zero `deltaMs` (pause), loop wraparound at
  `contentHeight`, non-loop clamp; `isAtEnd` boundaries.
- `barcode.ts` — `isRenderableUpc` (displayValue:false, jsdom-safe): valid UPC → true, junk
  → false.
- `scroller.ts` (jsdom, structural not visual) — only valid entries are rendered (rendered
  barcode count === valid-entry count); copy 2 is `display:none` whenever loop is off and
  visible when on; `setLoop` toggles it without rebuilding the DOM. (The finish summary's
  timing and layout-dependent behavior are verified in browser smoke, not jsdom.)

CI runs the test suite as a gate before building.

## Deployment (GitHub Actions → Pages)

- `vite.config.ts`: `base: '/scandible/'` for the GitHub Pages project subpath (emits
  `/scandible/assets/...`).
- **One-time repo setting:** Settings → Pages → Source = **GitHub Actions** must be enabled
  once before the first workflow run.
- `.github/workflows/deploy.yml` — the load-bearing details the original spec omitted:
  - **Trigger:** `on: push: branches: [main]` (+ `workflow_dispatch`).
  - **Permissions (required or `deploy-pages` fails):**
    `contents: read`, `pages: write`, `id-token: write`.
  - **Concurrency:** group `pages`, `cancel-in-progress: false` (let an in-flight publish
    finish).
  - **Build job:** `actions/checkout@v4` → `actions/setup-node@v4` (Node 20, npm cache) →
    `npm ci` → `npm test` → `npm run build` → `actions/configure-pages@v5` →
    `actions/upload-pages-artifact@v3` with `path: dist`.
  - **Deploy job:** `needs: build`, `environment: { name: github-pages, url: <steps output> }`,
    step `actions/deploy-pages@v4`.
- No build output is committed to the repo.

## Non-Goals (YAGNI)

- No snap-and-dwell or scan-detection feedback (continuous scroll was chosen).
- No managed add/remove/reorder list UI (paste / file / URL cover input).
- No symbologies beyond UPC-A.
- No virtualization for enormous lists (typical lists are dozens–hundreds; SVGs are light).
- No persistence beyond the share URL (no localStorage/accounts).

## Open Caveats

- Exact speed defaults/range and barcode dimensions are best tuned against the real scanner
  hardware; the spec's numbers are reasonable starting points.
- Extremely large lists could produce long URLs (mitigated by the warning) and many SVG
  nodes; virtualization is deliberately out of scope for v1.
- Layout-dependent behavior (repeat-period measurement, seamless wrap, `displayValue` text)
  is only observable in a real browser, so it is verified by manual smoke against the built
  app rather than jsdom unit tests.
