# SvelteKit Port — Design

**Date:** 2026-07-20
**Status:** Approved design, pre-implementation

## Goal

Port scandible from vanilla TypeScript + Vite to SvelteKit + Svelte 5, to make the
codebase more maintainable and easier to extend. The port is behavior-preserving with a
short list of deliberate light cleanups (below). Existing share links must keep working
unchanged.

## Decisions

- **Scope:** port + light cleanup. No visual redesign, no new features.
- **Framework:** SvelteKit 2 + Svelte 5 (runes), `@sveltejs/adapter-static`, all routes
  prerendered, SSR off (`ssr = false`); all real state is client-side.
- **Routing:** two routes — `/` (setup) and `/play` (play) — with codes and settings
  carried in query params using the existing share-URL format.
- **Migration strategy:** big-bang port on a feature branch (~700 source lines; no
  incremental machinery).
- **Testing:** `@testing-library/svelte` on the existing Vitest + jsdom setup. Pure-logic
  tests move verbatim.

## Structure

```
src/
  lib/            # logic modules, moved verbatim (imports become $lib/...)
    types.ts  upc.ts  scrollMath.ts  shareUrl.ts  transforms.ts
    barcode.ts  qr.ts  fileInput.ts  scroller.ts  jsbarcode.d.ts
  routes/
    +layout.svelte      # imports global styles.css, wraps pages
    +layout.ts          # export const prerender = true; export const ssr = false
    +page.svelte        # setup view
    play/+page.svelte   # play view
  app.html
  styles.css            # trimmed to base/reset; view styles move into components
```

`scroller.ts` stays an imperative, framework-free rAF engine that mutates
`style.transform` directly per frame. It is wrapped, not rewritten — per-frame Svelte
reactivity would be a regression.

## Build and deploy

- `paths.base = '/scandible'` in `svelte.config.js` replaces Vite's `base`.
- Adapter output stays `dist/` (adapter option `pages: 'dist'`, plus `assets: 'dist'`),
  so the GitHub Actions workflow changes only in the build step; upload/deploy steps are
  untouched.
- `svelte-check` is added to the test/CI script to type-check templates.
- `/` remains the setup page and accepts the same query params, so old deep links and
  share links keep working.

## Routes and state flow

`encodeShareUrl`/`decodeShareUrl` is the only state carrier between routes — no stores,
no in-memory handoff.

- **`/` (setup):** on load, decodes `page.url.searchParams` (same params as today). Form
  state is local `$state` runes. If no `seed` param is present, one is generated on load,
  as today.
- **Start:** `goto('/play' + encodeShareUrl(codes, settings))`. Play state lives in the
  URL: refresh mid-play stays in play, browser Back returns to setup, and a play session
  is shareable/bookmarkable.
- **`/play`:** decodes the same params, parses codes, filters to valid entries.
  **Guard:** if there are no valid codes (e.g. bare `/play`), redirect to `/` carrying
  whatever params were present.
- **Back (in play):** `goto('/' + encodeShareUrl(...))` with the _current_ codes and
  settings, so speed edits made during play survive the return trip (today they are
  silently dropped — deliberate cleanup #2).

## Components

- **`routes/+page.svelte` (setup):** textarea, file input, speed/loop/rotate/skew
  controls, validation list. Parsed entries and start-button enablement are `$derived`,
  replacing today's manual `refresh()` calls. Child components:
  - **`ValidationList.svelte`** — per-code valid/invalid list.
  - **`ShareLink.svelte`** — share button, URL field, long-URL warning, QR display and
    dense/too-long messaging (today ~40 lines of tangled show/hide logic).
- **`routes/play/+page.svelte`:** overlay controls, finish screen, idle-hide timer as
  component state.
- **`ScrollColumn.svelte`:** wrapper around the untouched `scroller.ts` — instantiates
  `createScroller` on mount, calls `destroy()` on unmount (fixes today's leaked `resize`
  listener), forwards `setSpeed`/`toggle`/`restart` from the page's controls.
- `barcode.ts` stays as-is, called only by the scroller.

## Error handling

Unchanged in substance, relocated:

- Per-parameter lenient URL decoding; never throws.
- Invalid codes flagged in the setup list and skipped in the scroll.
- File-read failure shows the inline error; validation list untouched.
- QR too-long/dense messaging as today.
- **New:** bare or all-invalid `/play` redirects to `/` rather than rendering an empty
  column.

## Testing

- **Move verbatim** (imports become `$lib/...`): `upc`, `scrollMath`, `shareUrl`,
  `transforms`, `types`, `qr`, `barcode`, `fileInput`, and `scroller` tests.
  `scroller.test.ts` already drives a plain DOM element in jsdom; no framework treatment
  needed.
- **Rewrite with `@testing-library/svelte`:**
  - `setupView.test.ts` → setup page component tests (validation flagging, start
    enablement, share/QR behavior).
  - `playView.test.ts` → play page component tests (overlay, finish screen, control
    wiring).
  - `main.test.ts` → route-level tests of decode-on-load and the `/play` redirect guard.
- Vitest runs with the Svelte plugin via the Kit-aware Vite config. Test count ends at
  parity or higher.

## Light cleanups (complete list)

1. Play becomes a real route — refresh-safe, Back works, sessions shareable.
2. Back from play carries current settings (speed tweaks survive).
3. Scroller destroyed on unmount — fixes the leaked `resize` listener.
4. `$derived` replaces manual `refresh()`/show-hide bookkeeping in setup.
5. View styles move into components; global CSS shrinks to a reset.
6. `svelte-check` added to CI.

Everything else — UPC validation rules, scroll math, share-URL format, QR behavior,
styling, speed range — is behavior-identical.
