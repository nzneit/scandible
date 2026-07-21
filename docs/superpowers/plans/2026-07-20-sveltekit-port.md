# SvelteKit Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port scandible from vanilla TypeScript + Vite to SvelteKit 2 + Svelte 5 (runes), behavior-preserving except for six approved light cleanups.

**Architecture:** Two prerendered static routes — `/` (setup) and `/play` — with codes+settings carried between them in query params via the existing `encodeShareUrl`/`decodeShareUrl` codec. All logic modules move verbatim to `src/lib/`. The imperative rAF scroller stays framework-free and is wrapped by a thin `ScrollColumn.svelte`. SSR is off; everything is client-side; adapter-static emits to `dist/` so the GitHub Pages workflow is untouched.

**Tech Stack:** SvelteKit 2, Svelte 5 (runes), `@sveltejs/adapter-static`, TypeScript, Vitest + jsdom, `@testing-library/svelte`, JsBarcode, uqr.

**Spec:** `docs/superpowers/specs/2026-07-20-sveltekit-port-design.md`

## Global Constraints

- Node >= 20.19 (required by Vite 7). Verify with `node --version` before Task 1. The dev machine has Node 24.18.0 via nvm — if a shell reports the old Homebrew 22.6.0, load nvm first (`. "$HOME/.nvm/nvm.sh"`).
- Share-URL format is FROZEN: params `codes` (newline-joined), `speed`, `loop`, `rot`, `rotmax`, `skew`, `skewmax`, `seed`, exactly as implemented in `src/lib/shareUrl.ts`. Never modify `shareUrl.ts`, `upc.ts`, `scrollMath.ts`, `transforms.ts`, `barcode.ts`, `qr.ts`, `fileInput.ts`, `types.ts`, or `scroller.ts` beyond moving them.
- `scroller.ts` stays framework-free: no Svelte imports, no reactivity. It is wrapped, never rewritten.
- CSS class names are FROZEN (tests and styles target them): `.setup`, `.upc-input`, `.file-input`, `.file-error`, `.settings-row`, `.field`, `.speed-input`, `.loop-input`, `.rotate-input`, `.rotate-max-input`, `.skew-input`, `.skew-max-input`, `.validation-list`, `.valid`, `.invalid`, `.share-row`, `.copy-link`, `.share-url`, `.url-warning`, `.qr-code`, `.qr-status`, `.start`, `.play`, `.scroll-column`, `.scroller-track`, `.scroller-copy`, `.barcode-item`, `.overlay`, `.hidden`, `.ctl-playpause`, `.ctl-speed`, `.ctl-restart`, `.ctl-back`, `.finish-screen`, `.finish-text`, `.finish-restart`, `.finish-back`.
- UI copy is FROZEN: `Share link`, `Start`, `Pause`/`Play`, `Restart`, `Back`, `Could not read file`, `Link is long; it may be truncated by some browsers.`, `QR is dense — hold the phone steady, or use the copied link.`, `Too many codes for a QR — share the copied link instead.`, `Finished scrolling N barcodes in X seconds`.
- Base path `/scandible` applies to production builds only (`NODE_ENV === 'production'`); dev and tests use `''`.
- Commit messages: conventional-commit prefix, imperative mood, NO `Co-Authored-By` or any AI attribution.
- Every task ends with `npm test` fully green (svelte-check + vitest) before its commit.

---

### Task 1: SvelteKit toolchain, and move all modules to src/lib

Replace the Vite scaffolding with SvelteKit, move every existing `src/*.ts` file (including views, main, and all tests — old view code is deleted in later tasks when its Svelte replacement lands) into `src/lib/`, and prove the whole existing suite still passes under the new toolchain. A placeholder `+page.svelte` makes `npm run build` verifiable; Task 4 replaces it.

**Files:**
- Create: `svelte.config.js`, `src/app.html`, `src/routes/+layout.ts`, `src/routes/+layout.svelte`, `src/routes/+page.svelte` (placeholder)
- Modify: `vite.config.ts`, `tsconfig.json`, `package.json`, `.gitignore`
- Move: `src/*.ts` → `src/lib/*.ts` (all 26 files incl. tests and `jsbarcode.d.ts`), `vitest.setup.ts` → `src/vitest.setup.ts`
- Delete: `index.html`
- Test: the entire existing suite, unmodified except one import path in `src/lib/main.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `$lib/<module>` aliases for every logic module (e.g. `$lib/types`, `$lib/upc`, `$lib/shareUrl`, `$lib/scroller`, `$lib/fileInput`, `$lib/qr`, `$lib/barcode`, `$lib/format` comes later); working `npm run dev|build|preview|check|test` scripts; `src/routes/` layout with `prerender = true`, `ssr = false`.

- [ ] **Step 1: Verify Node version**

Run: `node --version`
Expected: `v20.19.0` or newer (or v22.12+; the machine has v24.18.0 via nvm). If the shell reports v22.6.0, load nvm (`. "$HOME/.nvm/nvm.sh"`) and re-check before proceeding.

- [ ] **Step 2: Install the SvelteKit toolchain**

```bash
npm install --save-dev svelte @sveltejs/kit @sveltejs/adapter-static @sveltejs/vite-plugin-svelte svelte-check @testing-library/svelte vite@latest vitest@latest
```

Run: `npm ls svelte @sveltejs/kit vite vitest`
Expected majors: svelte 5, @sveltejs/kit 2, vite 7, vitest 3 (adapter-static 3, vite-plugin-svelte 6, @testing-library/svelte 5). If npm reports ERESOLVE, align the conflicting majors per the peer-dependency message rather than using `--force`.

- [ ] **Step 3: Write `svelte.config.js`**

```js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // Emit to dist/ so the GitHub Pages workflow's upload path is unchanged.
    adapter: adapter({ pages: 'dist', assets: 'dist' }),
    // Project-site subpath on GitHub Pages; dev and tests serve from root.
    paths: { base: process.env.NODE_ENV === 'production' ? '/scandible' : '' },
  },
};

export default config;
```

- [ ] **Step 4: Rewrite `vite.config.ts`**

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit(), svelteTesting()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/vitest.setup.ts'],
  },
});
```

- [ ] **Step 5: Write `src/app.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>scandible</title>
    %sveltekit.head%
  </head>
  <body>
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

- [ ] **Step 6: Write the layout and placeholder page**

`src/routes/+layout.ts`:

```ts
export const prerender = true;
export const ssr = false;
```

`src/routes/+layout.svelte`:

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
  import '../styles.css';

  let { children }: { children: Snippet } = $props();
</script>

{@render children()}
```

`src/routes/+page.svelte` (placeholder — replaced wholesale in Task 4):

```svelte
<h1>scandible</h1>
```

- [ ] **Step 7: Move all source modules and tests into `src/lib/`, move the vitest setup file, delete `index.html`**

```bash
mkdir -p src/lib
git mv src/*.ts src/lib/
git mv vitest.setup.ts src/vitest.setup.ts
git rm index.html
```

Note: `src/styles.css` stays at `src/styles.css`. Colocated tests import their subjects relatively (`./upc` etc.), so no import edits are needed inside `src/lib/` — except one, next step.

- [ ] **Step 8: Fix the one broken relative import**

In `src/lib/main.ts`, line 1: change `import './styles.css';` to `import '../styles.css';` (the file moved down a directory; styles.css did not).

- [ ] **Step 9: Rewrite `tsconfig.json`**

```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true
  }
}
```

- [ ] **Step 10: Update `package.json` scripts**

Replace the `scripts` block with:

```json
"scripts": {
  "dev": "vite dev",
  "build": "vite build",
  "preview": "vite preview",
  "prepare": "svelte-kit sync",
  "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
  "test": "npm run check && vitest run"
}
```

- [ ] **Step 11: Ignore the generated directory**

Append `.svelte-kit` on its own line to `.gitignore`.

- [ ] **Step 12: Sync and run the full suite**

```bash
npx svelte-kit sync
npm test
```

Expected: svelte-check reports 0 errors; vitest runs the entire pre-existing suite (upc, types, scrollMath, shareUrl, transforms, barcode, qr, fileInput, scroller, setupView, playView, main) — all PASS. The old view tests still pass because the moved files are plain DOM code running under jsdom.

- [ ] **Step 13: Verify the build**

Run: `npm run build`
Expected: succeeds; `ls dist` shows `index.html` and `_app/`. (No `play.html` yet — that route arrives in Task 6.)

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "refactor: swap Vite scaffolding for SvelteKit, move modules to src/lib"
```

---

### Task 2: ValidationList component

**Files:**
- Create: `src/lib/components/ValidationList.svelte`
- Test: `src/lib/components/ValidationList.test.ts`

**Interfaces:**
- Consumes: `UpcEntry` from `$lib/types` (`{ raw: string; value: string; valid: boolean }`).
- Produces: `ValidationList.svelte` with props `{ entries: UpcEntry[] }`. Renders `<ul class="validation-list">` with one `<li>` per entry, class `valid`/`invalid`, text `` `${raw} ✓` `` or `` `${raw} ✗ invalid` ``. Task 4 imports it as `$lib/components/ValidationList.svelte`.

- [ ] **Step 1: Write the failing test**

`src/lib/components/ValidationList.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import ValidationList from './ValidationList.svelte';
import type { UpcEntry } from '$lib/types';

const entry = (raw: string, valid: boolean): UpcEntry => ({ raw, value: raw, valid });

describe('ValidationList', () => {
  it('renders one li per entry with valid/invalid classes and copy', () => {
    const { container } = render(ValidationList, {
      entries: [entry('036000291452', true), entry('bad', false)],
    });
    const items = container.querySelectorAll('.validation-list li');
    expect(items.length).toBe(2);
    expect(items[0].classList.contains('valid')).toBe(true);
    expect(items[0].textContent).toBe('036000291452 ✓');
    expect(items[1].classList.contains('invalid')).toBe(true);
    expect(items[1].textContent).toBe('bad ✗ invalid');
  });

  it('renders no items for an empty list', () => {
    const { container } = render(ValidationList, { entries: [] });
    expect(container.querySelectorAll('.validation-list li').length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/components/ValidationList.test.ts`
Expected: FAIL — cannot resolve `./ValidationList.svelte`.

- [ ] **Step 3: Write the component**

`src/lib/components/ValidationList.svelte`:

```svelte
<script lang="ts">
  import type { UpcEntry } from '$lib/types';

  let { entries }: { entries: UpcEntry[] } = $props();
</script>

<ul class="validation-list">
  {#each entries as entry}
    <li class={entry.valid ? 'valid' : 'invalid'}>{entry.raw} {entry.valid ? '✓' : '✗ invalid'}</li>
  {/each}
</ul>

<style>
  .validation-list { list-style: none; padding: 0; margin: 0; max-height: 200px; overflow: auto; }
  .validation-list .valid { color: #0a0; }
  .validation-list .invalid { color: #c00; }
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/components/ValidationList.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Full suite and commit**

```bash
npm test
git add src/lib/components/ValidationList.svelte src/lib/components/ValidationList.test.ts
git commit -m "feat: ValidationList component"
```

---

### Task 3: ShareLink component

Owns the share button, URL field, long-URL warning, and QR display — the logic that lived in `setupView.ts` lines 140–159 plus the clear-on-change behavior. The QR (and its status line) clears whenever the `codes` or `settings` props change identity; the URL field and warning persist until the next click, matching today.

**Files:**
- Create: `src/lib/components/ShareLink.svelte`
- Test: `src/lib/components/ShareLink.test.ts`

**Interfaces:**
- Consumes: `encodeShareUrl(codes: string[], settings: Settings): string` from `$lib/shareUrl`; `buildQrSvg(text: string): QrResult` from `$lib/qr`; `Settings` from `$lib/types`.
- Produces: `ShareLink.svelte` with props `{ codes: string[]; settings: Settings }`. Task 4 imports it as `$lib/components/ShareLink.svelte` and passes fresh array/object identities on every edit (that identity change is what clears the QR).

- [ ] **Step 1: Write the failing test**

`src/lib/components/ShareLink.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ShareLink from './ShareLink.svelte';
import { DEFAULT_SETTINGS, type Settings } from '$lib/types';

const SETTINGS: Settings = { ...DEFAULT_SETTINGS };
const q = <T extends Element>(c: Element, sel: string) => c.querySelector(sel) as T;

describe('ShareLink', () => {
  it('labels the button "Share link"', () => {
    const { container } = render(ShareLink, { codes: ['036000291452'], settings: SETTINGS });
    expect(q<HTMLButtonElement>(container, '.copy-link').textContent).toBe('Share link');
  });

  it('builds the share URL into .share-url on click', async () => {
    const { container } = render(ShareLink, { codes: ['036000291452'], settings: SETTINGS });
    await fireEvent.click(q(container, '.copy-link'));
    const url = q<HTMLInputElement>(container, '.share-url').value;
    expect(url).toContain('codes=036000291452');
    expect(url).toContain('seed=0');
  });

  it('shows the long-URL warning when the share URL exceeds ~2000 chars', async () => {
    const codes = Array.from({ length: 200 }, () => '036000291452');
    const { container } = render(ShareLink, { codes, settings: SETTINGS });
    await fireEvent.click(q(container, '.copy-link'));
    expect(q<HTMLInputElement>(container, '.share-url').value.length).toBeGreaterThan(2000);
    expect(q<HTMLElement>(container, '.url-warning').hidden).toBe(false);
  });

  it('keeps the long-URL warning hidden for a short share URL', async () => {
    const { container } = render(ShareLink, { codes: ['036000291452'], settings: SETTINGS });
    await fireEvent.click(q(container, '.copy-link'));
    expect(q<HTMLInputElement>(container, '.share-url').value.length).toBeLessThanOrEqual(2000);
    expect(q<HTMLElement>(container, '.url-warning').hidden).toBe(true);
  });

  it('renders a QR code into .qr-code on click', async () => {
    const { container } = render(ShareLink, { codes: ['036000291452'], settings: SETTINGS });
    await fireEvent.click(q(container, '.copy-link'));
    const qr = q<HTMLElement>(container, '.qr-code');
    expect(qr.hidden).toBe(false);
    expect(qr.querySelector('svg')).not.toBeNull();
  });

  it('shows the dense warning for a long code list', async () => {
    const codes = Array.from({ length: 80 }, () => '036000291452');
    const { container } = render(ShareLink, { codes, settings: SETTINGS });
    await fireEvent.click(q(container, '.copy-link'));
    const status = q<HTMLElement>(container, '.qr-status');
    expect(status.hidden).toBe(false);
    expect(status.textContent).toContain('dense');
    expect(q<HTMLElement>(container, '.qr-code').querySelector('svg')).not.toBeNull();
  });

  it('shows the too-long fallback and no QR for an over-capacity code list', async () => {
    const codes = Array.from({ length: 300 }, () => '036000291452');
    const { container } = render(ShareLink, { codes, settings: SETTINGS });
    await fireEvent.click(q(container, '.copy-link'));
    const status = q<HTMLElement>(container, '.qr-status');
    expect(status.hidden).toBe(false);
    expect(status.textContent).toContain('Too many codes');
    const qr = q<HTMLElement>(container, '.qr-code');
    expect(qr.hidden).toBe(true);
    expect(qr.querySelector('svg')).toBeNull();
  });

  it('clears a rendered QR when the codes prop changes', async () => {
    const { container, rerender } = render(ShareLink, { codes: ['036000291452'], settings: SETTINGS });
    await fireEvent.click(q(container, '.copy-link'));
    expect(q<HTMLElement>(container, '.qr-code').querySelector('svg')).not.toBeNull();
    await rerender({ codes: ['012345678905'] });
    const qr = q<HTMLElement>(container, '.qr-code');
    expect(qr.hidden).toBe(true);
    expect(qr.querySelector('svg')).toBeNull();
    expect(q<HTMLElement>(container, '.qr-status').hidden).toBe(true);
  });

  it('clears a rendered QR when the settings prop changes', async () => {
    const { container, rerender } = render(ShareLink, { codes: ['036000291452'], settings: SETTINGS });
    await fireEvent.click(q(container, '.copy-link'));
    expect(q<HTMLElement>(container, '.qr-code').querySelector('svg')).not.toBeNull();
    await rerender({ settings: { ...SETTINGS, loop: true } });
    expect(q<HTMLElement>(container, '.qr-code').hidden).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/components/ShareLink.test.ts`
Expected: FAIL — cannot resolve `./ShareLink.svelte`.

- [ ] **Step 3: Write the component**

`src/lib/components/ShareLink.svelte`:

```svelte
<script lang="ts">
  import { encodeShareUrl } from '$lib/shareUrl';
  import { buildQrSvg } from '$lib/qr';
  import type { Settings } from '$lib/types';

  const URL_WARN_LENGTH = 2000;
  const QR_DENSE_MSG = 'QR is dense — hold the phone steady, or use the copied link.';
  const QR_TOO_LONG_MSG = 'Too many codes for a QR — share the copied link instead.';

  let { codes, settings }: { codes: string[]; settings: Settings } = $props();

  let url = $state('');
  let warnLong = $state(false);
  let qrSvg = $state('');
  let qrStatus = $state('');

  // Any change to the shared content invalidates a rendered QR (the URL field and
  // warning persist until the next click, matching the old view).
  $effect(() => {
    void codes;
    void settings;
    qrSvg = '';
    qrStatus = '';
  });

  function share(): void {
    const u = location.origin + location.pathname + encodeShareUrl(codes, settings);
    url = u;
    warnLong = u.length > URL_WARN_LENGTH;
    void navigator.clipboard?.writeText(u).catch(() => {});

    const qr = buildQrSvg(u);
    if (qr.ok) {
      qrSvg = qr.svg;
      qrStatus = qr.dense ? QR_DENSE_MSG : '';
    } else {
      qrSvg = '';
      qrStatus = QR_TOO_LONG_MSG;
    }
  }
</script>

<div class="share-row">
  <button type="button" class="copy-link" onclick={share}>Share link</button>
  <input type="text" class="share-url" readonly value={url} />
  <span class="url-warning" hidden={!warnLong}>Link is long; it may be truncated by some browsers.</span>
</div>
<div class="qr-code" hidden={!qrSvg} aria-label="QR code for the share link">{@html qrSvg}</div>
<p class="qr-status" hidden={!qrStatus}>{qrStatus}</p>

<style>
  .share-url { flex: 1; font-family: monospace; }
  .qr-code { background: #fff; padding: 12px; max-width: 240px; }
  .qr-code :global(svg) { width: 100%; height: auto; display: block; }
  .qr-status { color: #c60; margin: 4px 0 0; }
</style>
```

Note: `.qr-code :global(svg)` is required — the SVG arrives via `{@html}`, so Svelte's scoping (and unused-selector pruning) can't see it.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/components/ShareLink.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Full suite and commit**

```bash
npm test
git add src/lib/components/ShareLink.svelte src/lib/components/ShareLink.test.ts
git commit -m "feat: ShareLink component with QR and long-URL warning"
```

---

### Task 4: Setup page route

Replaces the placeholder `+page.svelte` with the real setup view, then deletes `setupView.ts` and `main.ts` (and their tests) — every behavior they covered is re-tested here at the route level. Start now navigates to `/play?…` instead of swapping views in place.

**Files:**
- Create: `src/routes/+page.svelte` (replaces placeholder), `src/routes/page.test.ts`
- Delete: `src/lib/setupView.ts`, `src/lib/setupView.test.ts`, `src/lib/main.ts`, `src/lib/main.test.ts`

**Interfaces:**
- Consumes: `parseUpcList(raw: string): UpcEntry[]` from `$lib/upc`; `readUpcFile(file: File): Promise<string>` from `$lib/fileInput`; `decodeShareUrl(search: string)` / `encodeShareUrl(codes, settings)` from `$lib/shareUrl`; `DEFAULT_SETTINGS`, `Settings` from `$lib/types`; `ValidationList.svelte` (Task 2); `ShareLink.svelte` (Task 3); SvelteKit's `goto` (`$app/navigation`), `base` (`$app/paths`), `page` (`$app/state`).
- Produces: the `/` route. On Start it calls `` goto(`${base}/play${encodeShareUrl(rawCodes, settings)}`) `` — Task 6's play route decodes exactly that URL shape.

- [ ] **Step 1: Write the failing test**

`src/routes/page.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SetupPage from './+page.svelte';
import { readUpcFile } from '$lib/fileInput';

const mockPage = vi.hoisted(() => ({ url: new URL('http://localhost/') }));
const goto = vi.hoisted(() => vi.fn());
vi.mock('$app/state', () => ({ page: mockPage }));
vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$app/paths', () => ({ base: '' }));
vi.mock('$lib/fileInput', () => ({ readUpcFile: vi.fn() }));

const q = <T extends Element>(c: Element, sel: string) => c.querySelector(sel) as T;

beforeEach(() => {
  mockPage.url = new URL('http://localhost/');
  goto.mockReset();
});

describe('setup page', () => {
  it('prefills the textarea and settings from the URL', () => {
    mockPage.url = new URL('http://localhost/?codes=036000291452&speed=120&loop=1');
    const { container } = render(SetupPage);
    expect(q<HTMLTextAreaElement>(container, '.upc-input').value).toBe('036000291452');
    expect(q<HTMLInputElement>(container, '.speed-input').value).toBe('120');
    expect(q<HTMLInputElement>(container, '.loop-input').checked).toBe(true);
  });

  it('flags invalid entries and disables Start until there is a valid one', async () => {
    const { container } = render(SetupPage);
    const input = q<HTMLTextAreaElement>(container, '.upc-input');
    const start = q<HTMLButtonElement>(container, '.start');
    expect(start.disabled).toBe(true);

    await fireEvent.input(input, { target: { value: 'bad' } });
    expect(container.querySelectorAll('.validation-list li').length).toBe(1);
    expect(container.querySelector('.validation-list li')?.classList.contains('invalid')).toBe(true);
    expect(start.disabled).toBe(true);

    await fireEvent.input(input, { target: { value: 'bad\n036000291452' } });
    expect(start.disabled).toBe(false);
  });

  it('navigates to /play with the full encoded state on Start', async () => {
    mockPage.url = new URL('http://localhost/?codes=036000291452&seed=0');
    const { container } = render(SetupPage);
    await fireEvent.click(q(container, '.start'));
    expect(goto).toHaveBeenCalledWith(
      '/play?codes=036000291452&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0',
    );
  });

  it('carries rotation, skew, and the seed into the Start URL', async () => {
    mockPage.url = new URL(
      'http://localhost/?codes=036000291452&rot=1&rotmax=25&skew=1&skewmax=20&seed=999',
    );
    const { container } = render(SetupPage);
    await fireEvent.click(q(container, '.start'));
    const url = goto.mock.calls[0][0] as string;
    expect(url).toContain('rot=1');
    expect(url).toContain('rotmax=25');
    expect(url).toContain('skew=1');
    expect(url).toContain('skewmax=20');
    expect(url).toContain('seed=999');
  });

  it('prefills rotation and skew controls and disables each slider when its toggle is off', () => {
    mockPage.url = new URL(
      'http://localhost/?codes=036000291452&rot=0&rotmax=20&skew=0&skewmax=15&seed=77',
    );
    const { container } = render(SetupPage);
    expect(q<HTMLInputElement>(container, '.rotate-input').checked).toBe(false);
    expect(q<HTMLInputElement>(container, '.rotate-max-input').value).toBe('20');
    expect(q<HTMLInputElement>(container, '.rotate-max-input').disabled).toBe(true);
    expect(q<HTMLInputElement>(container, '.skew-input').checked).toBe(false);
    expect(q<HTMLInputElement>(container, '.skew-max-input').value).toBe('15');
    expect(q<HTMLInputElement>(container, '.skew-max-input').disabled).toBe(true);
  });

  it('enables the rotation slider when its checkbox is checked', async () => {
    mockPage.url = new URL('http://localhost/?codes=036000291452');
    const { container } = render(SetupPage);
    const cb = q<HTMLInputElement>(container, '.rotate-input');
    const slider = q<HTMLInputElement>(container, '.rotate-max-input');
    expect(slider.disabled).toBe(true);
    await fireEvent.click(cb);
    expect(slider.disabled).toBe(false);
  });

  it('builds a share URL into .share-url via ShareLink', async () => {
    mockPage.url = new URL('http://localhost/?codes=036000291452');
    const { container } = render(SetupPage);
    await fireEvent.click(q(container, '.copy-link'));
    expect(q<HTMLInputElement>(container, '.share-url').value).toContain('codes=036000291452');
  });

  it('preserves a URL-provided seed in the share URL', async () => {
    mockPage.url = new URL('http://localhost/?codes=036000291452&skew=1&seed=424242');
    const { container } = render(SetupPage);
    await fireEvent.click(q(container, '.copy-link'));
    expect(q<HTMLInputElement>(container, '.share-url').value).toContain('seed=424242');
  });

  it('generates a session seed from Math.random when the URL has none', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.42);
    try {
      mockPage.url = new URL('http://localhost/?codes=036000291452');
      const { container } = render(SetupPage);
      await fireEvent.click(q(container, '.copy-link'));
      const url = q<HTMLInputElement>(container, '.share-url').value;
      const expectedSeed = Math.floor(0.42 * 0x100000000) >>> 0;
      expect(randomSpy).toHaveBeenCalled();
      expect(url).toContain(`seed=${expectedSeed}`);
      expect(expectedSeed).not.toBe(0);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('generates different seeds across sessions when the URL has none', async () => {
    mockPage.url = new URL('http://localhost/?codes=036000291452');
    const first = render(SetupPage);
    await fireEvent.click(q(first.container, '.copy-link'));
    const url1 = q<HTMLInputElement>(first.container, '.share-url').value;

    const second = render(SetupPage);
    await fireEvent.click(q(second.container, '.copy-link'));
    const url2 = q<HTMLInputElement>(second.container, '.share-url').value;

    expect(url1.match(/[?&]seed=(\d+)/)![1]).not.toBe(url2.match(/[?&]seed=(\d+)/)![1]);
  });

  it('clears a rendered QR when the code list is edited afterwards', async () => {
    mockPage.url = new URL('http://localhost/?codes=036000291452');
    const { container } = render(SetupPage);
    await fireEvent.click(q(container, '.copy-link'));
    expect(q<HTMLElement>(container, '.qr-code').querySelector('svg')).not.toBeNull();
    await fireEvent.input(q(container, '.upc-input'), { target: { value: '012345678905' } });
    const qr = q<HTMLElement>(container, '.qr-code');
    expect(qr.hidden).toBe(true);
    expect(qr.querySelector('svg')).toBeNull();
  });

  it('clears a rendered QR when a setting is changed afterwards', async () => {
    mockPage.url = new URL('http://localhost/?codes=036000291452');
    const { container } = render(SetupPage);
    await fireEvent.click(q(container, '.copy-link'));
    expect(q<HTMLElement>(container, '.qr-code').querySelector('svg')).not.toBeNull();
    await fireEvent.click(q(container, '.loop-input'));
    expect(q<HTMLElement>(container, '.qr-code').hidden).toBe(true);
  });

  it('loads codes from a file into the textarea', async () => {
    const { container } = render(SetupPage);
    vi.mocked(readUpcFile).mockResolvedValueOnce('036000291452\n012345678905');
    const fileInput = q<HTMLInputElement>(container, '.file-input');
    const file = new File(['x'], 'codes.txt', { type: 'text/plain' });
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    await fireEvent.change(fileInput);
    await vi.waitFor(() =>
      expect(q<HTMLTextAreaElement>(container, '.upc-input').value).toBe(
        '036000291452\n012345678905',
      ),
    );
    expect(container.querySelectorAll('.validation-list li').length).toBe(2);
  });

  it('shows an inline file error and leaves the existing validation list untouched on read failure', async () => {
    mockPage.url = new URL('http://localhost/?codes=036000291452');
    const { container } = render(SetupPage);
    const originalCount = container.querySelectorAll('.validation-list li').length;
    const originalFirst = container.querySelector('.validation-list li')?.textContent;
    expect(originalCount).toBeGreaterThan(0);

    vi.mocked(readUpcFile).mockRejectedValueOnce(new Error('boom'));
    const fileInput = q<HTMLInputElement>(container, '.file-input');
    const file = new File(['x'], 'codes.txt', { type: 'text/plain' });
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    await fireEvent.change(fileInput);

    const fileError = q<HTMLElement>(container, '.file-error');
    await vi.waitFor(() => expect(fileError.hidden).toBe(false));
    expect(fileError.textContent).toBeTruthy();
    expect(container.querySelectorAll('.validation-list li').length).toBe(originalCount);
    expect(container.querySelector('.validation-list li')?.textContent).toBe(originalFirst);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/routes/page.test.ts`
Expected: FAIL — the placeholder page has no `.upc-input`, `.start`, etc.

- [ ] **Step 3: Replace the placeholder with the real setup page**

`src/routes/+page.svelte` (full replacement):

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/state';
  import { parseUpcList } from '$lib/upc';
  import { readUpcFile } from '$lib/fileInput';
  import { decodeShareUrl, encodeShareUrl } from '$lib/shareUrl';
  import { DEFAULT_SETTINGS, type Settings, type UpcEntry } from '$lib/types';
  import ValidationList from '$lib/components/ValidationList.svelte';
  import ShareLink from '$lib/components/ShareLink.svelte';

  const decoded = decodeShareUrl(page.url.search);
  const initial: Settings = { ...DEFAULT_SETTINGS, ...decoded.settings };
  const seed = decoded.settings.seed ?? Math.floor(Math.random() * 0x100000000) >>> 0;

  let text = $state(decoded.codes.join('\n'));
  let speedPxPerSec = $state(initial.speedPxPerSec);
  let loop = $state(initial.loop);
  let rotate = $state(initial.rotate);
  let rotateMaxDeg = $state(initial.rotateMaxDeg);
  let skew = $state(initial.skew);
  let skewMaxDeg = $state(initial.skewMaxDeg);
  let fileError = $state('');

  const entries: UpcEntry[] = $derived(parseUpcList(text));
  const rawCodes: string[] = $derived(entries.map((e) => e.raw));
  const canStart: boolean = $derived(entries.some((e) => e.valid));
  const settings: Settings = $derived({
    speedPxPerSec,
    loop,
    rotate,
    rotateMaxDeg,
    skew,
    skewMaxDeg,
    seed,
  });

  async function onFileChange(e: Event): Promise<void> {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      text = await readUpcFile(file);
      fileError = '';
    } catch {
      // Inline error only; the existing validation list is left untouched.
      fileError = 'Could not read file';
    }
  }

  function start(): void {
    goto(`${base}/play${encodeShareUrl(rawCodes, settings)}`);
  }
</script>

<div class="setup">
  <h1>scandible</h1>
  <textarea
    class="upc-input"
    rows="8"
    placeholder="Paste UPC codes, one per line"
    bind:value={text}
    oninput={() => (fileError = '')}
  ></textarea>
  <input type="file" class="file-input" accept=".txt,.csv" onchange={onFileChange} />
  <p class="file-error" hidden={!fileError}>{fileError}</p>
  <div class="settings-row">
    <label class="field">Speed
      <input type="range" class="speed-input" min="10" max="5000" step="5" bind:value={speedPxPerSec} />
    </label>
    <label class="field">Loop
      <input type="checkbox" class="loop-input" bind:checked={loop} />
    </label>
    <label class="field">Random rotation
      <input type="checkbox" class="rotate-input" bind:checked={rotate} />
      <input type="range" class="rotate-max-input" min="1" max="30" step="1" bind:value={rotateMaxDeg} disabled={!rotate} />
    </label>
    <label class="field">Random skew
      <input type="checkbox" class="skew-input" bind:checked={skew} />
      <input type="range" class="skew-max-input" min="1" max="30" step="1" bind:value={skewMaxDeg} disabled={!skew} />
    </label>
  </div>
  <ValidationList {entries} />
  <ShareLink codes={rawCodes} {settings} />
  <button type="button" class="start" disabled={!canStart} onclick={start}>Start</button>
</div>

<style>
  .setup { max-width: 640px; margin: 0 auto; padding: 24px; display: flex; flex-direction: column; gap: 12px; }
  .upc-input { width: 100%; font-family: monospace; }
  /* Each setting on its own line: label text on top, input(s) below, spaced apart. */
  .settings-row { display: flex; flex-direction: column; gap: 16px; }
  .field { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
  .start { padding: 12px; font-size: 1.1rem; }
  .start:disabled { opacity: 0.5; }
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/routes/page.test.ts`
Expected: PASS (14 tests).

- [ ] **Step 5: Delete the superseded view and entry modules**

```bash
git rm src/lib/setupView.ts src/lib/setupView.test.ts src/lib/main.ts src/lib/main.test.ts
```

(Coverage accounting: every `setupView.test.ts` case and the three seed/prefill cases from `main.test.ts` now live in `src/routes/page.test.ts`; `main.test.ts`'s "switches to play and back" case is replaced by the Start-goto test above plus Task 6's play-page tests.)

- [ ] **Step 6: Full suite and commit**

```bash
npm test
git add -A
git commit -m "feat: setup page route replacing setupView"
```

---

### Task 5: ScrollColumn component

Thin lifecycle wrapper around the untouched imperative scroller: create on mount, `destroy()` on unmount (this fixes the old leaked `resize` listener — cleanup #3), and forward control calls.

**Files:**
- Create: `src/lib/components/ScrollColumn.svelte`
- Test: `src/lib/components/ScrollColumn.test.ts`

**Interfaces:**
- Consumes: `createScroller(container: HTMLElement, entries: UpcEntry[], settings: Settings, onFinish?: (s: { count: number; seconds: number }) => void): Scroller` from `$lib/scroller`.
- Produces: `ScrollColumn.svelte` with props `{ entries: UpcEntry[]; settings: Settings; onFinish?: (s: { count: number; seconds: number }) => void }`; instance exports `toggle(): void`, `restart(): void`, `setSpeed(pxPerSec: number): void`, `isPlaying(): boolean`; module-script export `interface ScrollColumnHandle` with those four methods (Task 6 types its `bind:this` with it). Plays automatically on mount.

- [ ] **Step 1: Write the failing test**

`src/lib/components/ScrollColumn.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import ScrollColumn from './ScrollColumn.svelte';
import { DEFAULT_SETTINGS, type Settings, type UpcEntry } from '$lib/types';

const entry = (value: string, valid: boolean): UpcEntry => ({ raw: value, value, valid });
const entries: UpcEntry[] = [entry('036000291452', true), entry('bad', false), entry('012345678905', true)];
const SETTINGS: Settings = { ...DEFAULT_SETTINGS };

describe('ScrollColumn', () => {
  it('mounts the scroller (2 valid entries × 2 copies) and starts playing', () => {
    const { container, component } = render(ScrollColumn, { entries, settings: SETTINGS });
    expect(container.querySelectorAll('.barcode-item').length).toBe(4);
    expect(component.isPlaying()).toBe(true);
  });

  it('forwards toggle() to the scroller', () => {
    const { component } = render(ScrollColumn, { entries, settings: SETTINGS });
    expect(component.isPlaying()).toBe(true);
    component.toggle();
    expect(component.isPlaying()).toBe(false);
    component.toggle();
    expect(component.isPlaying()).toBe(true);
  });

  it('destroys the scroller on unmount (removes the resize listener)', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(ScrollColumn, { entries, settings: SETTINGS });
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    removeSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/components/ScrollColumn.test.ts`
Expected: FAIL — cannot resolve `./ScrollColumn.svelte`.

- [ ] **Step 3: Write the component**

`src/lib/components/ScrollColumn.svelte`:

```svelte
<script lang="ts" module>
  export interface ScrollColumnHandle {
    toggle(): void;
    restart(): void;
    setSpeed(pxPerSec: number): void;
    isPlaying(): boolean;
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { createScroller, type Scroller } from '$lib/scroller';
  import type { Settings, UpcEntry } from '$lib/types';

  let {
    entries,
    settings,
    onFinish,
  }: {
    entries: UpcEntry[];
    settings: Settings;
    onFinish?: (summary: { count: number; seconds: number }) => void;
  } = $props();

  let container: HTMLDivElement | undefined;
  let scroller: Scroller | undefined;

  onMount(() => {
    if (!container) return;
    scroller = createScroller(container, entries, settings, onFinish);
    scroller.play();
    return () => scroller?.destroy();
  });

  export function toggle(): void {
    scroller?.toggle();
  }
  export function restart(): void {
    scroller?.restart();
  }
  export function setSpeed(pxPerSec: number): void {
    scroller?.setSpeed(pxPerSec);
  }
  export function isPlaying(): boolean {
    return scroller?.isPlaying() ?? false;
  }
</script>

<div class="scroll-column" bind:this={container}></div>

<style>
  .scroll-column { position: absolute; inset: 0; display: flex; justify-content: center; }
  /* The scroller builds its DOM imperatively, invisible to Svelte's scoping —
     every descendant selector must be :global. Seam-uniform rhythm: equal
     top+bottom padding per barcode, no last-item margin, no collapsing margins —
     so the copy1/copy2 gap equals the internal gap. */
  .scroll-column :global(.scroller-track) { display: flex; flex-direction: column; will-change: transform; }
  .scroll-column :global(.scroller-copy) { display: flex; flex-direction: column; }
  .scroll-column :global(.barcode-item) {
    display: flex;
    justify-content: center;
    padding: 40vh 0; /* generous: isolates one barcode in the scan zone */
  }
  .scroll-column :global(.barcode-item svg) { max-width: min(90vw, 640px); height: auto; }
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/components/ScrollColumn.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Full suite and commit**

```bash
npm test
git add src/lib/components/ScrollColumn.svelte src/lib/components/ScrollColumn.test.ts
git commit -m "feat: ScrollColumn wrapper with lifecycle-managed scroller"
```

---

### Task 6: Play page route

The `/play` route: decodes the URL, guards against no-valid-codes, drives ScrollColumn, renders the overlay + finish screen, and sends Back to `/` with the *current* settings (cleanup #2). `formatFinishMessage` moves to `$lib/format.ts`. Deletes `playView.ts` and its test.

**Files:**
- Create: `src/lib/format.ts`, `src/lib/format.test.ts`, `src/routes/play/+page.svelte`, `src/routes/play/page.test.ts`
- Delete: `src/lib/playView.ts`, `src/lib/playView.test.ts`

**Interfaces:**
- Consumes: `ScrollColumn.svelte` + `ScrollColumnHandle` (Task 5); `decodeShareUrl`/`encodeShareUrl`; `parseUpcList`; `DEFAULT_SETTINGS`, `Settings`; `goto`, `base`, `page` from `$app/*`.
- Produces: `formatFinishMessage(count: number, seconds: number): string` in `$lib/format`; the `/play` route consumed by Task 4's Start navigation.

- [ ] **Step 1: Write the failing format test**

`src/lib/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatFinishMessage } from './format';

describe('formatFinishMessage', () => {
  it('formats the finish copy exactly', () => {
    expect(formatFinishMessage(3, 12.4)).toBe('Finished scrolling 3 barcodes in 12.4 seconds');
  });
});
```

Run: `npx vitest run src/lib/format.test.ts`
Expected: FAIL — cannot resolve `./format`.

- [ ] **Step 2: Write `src/lib/format.ts`**

```ts
/** Finish-screen copy. Kept in $lib so the play route and tests share one source. */
export function formatFinishMessage(count: number, seconds: number): string {
  return `Finished scrolling ${count} barcodes in ${seconds} seconds`;
}
```

Run: `npx vitest run src/lib/format.test.ts`
Expected: PASS.

- [ ] **Step 3: Write the failing play page test**

`src/routes/play/page.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import PlayPage from './+page.svelte';
import { encodeShareUrl } from '$lib/shareUrl';
import { DEFAULT_SETTINGS } from '$lib/types';

const mockPage = vi.hoisted(() => ({ url: new URL('http://localhost/play') }));
const goto = vi.hoisted(() => vi.fn());
vi.mock('$app/state', () => ({ page: mockPage }));
vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$app/paths', () => ({ base: '' }));

const q = <T extends Element>(c: Element, sel: string) => c.querySelector(sel) as T;
const CODES = ['036000291452', 'bad', '012345678905'];
const PLAY_URL = 'http://localhost/play?codes=036000291452%0Abad%0A012345678905&seed=7';

beforeEach(() => {
  mockPage.url = new URL(PLAY_URL);
  goto.mockReset();
});

describe('play page', () => {
  it('renders the scroll column and overlay controls, with no finish screen', () => {
    const { container } = render(PlayPage);
    expect(container.querySelectorAll('.barcode-item').length).toBe(4); // 2 valid × 2 copies
    expect(container.querySelector('.ctl-playpause')).not.toBeNull();
    expect(container.querySelector('.ctl-speed')).not.toBeNull();
    expect(container.querySelector('.finish-screen')).toBeNull();
  });

  it('toggles the play/pause label', async () => {
    const { container } = render(PlayPage);
    const btn = q<HTMLButtonElement>(container, '.ctl-playpause');
    expect(btn.textContent).toBe('Pause');
    await fireEvent.click(btn);
    expect(btn.textContent).toBe('Play');
    await fireEvent.click(btn);
    expect(btn.textContent).toBe('Pause');
  });

  it('navigates back to setup carrying the decoded state', async () => {
    const { container } = render(PlayPage);
    await fireEvent.click(q(container, '.ctl-back'));
    expect(goto).toHaveBeenCalledWith(
      '/' + encodeShareUrl(CODES, { ...DEFAULT_SETTINGS, seed: 7 }),
    );
  });

  it('carries a mid-play speed edit back to setup', async () => {
    const { container } = render(PlayPage);
    await fireEvent.input(q(container, '.ctl-speed'), { target: { value: '300' } });
    await fireEvent.click(q(container, '.ctl-back'));
    expect(goto).toHaveBeenCalledWith(
      '/' + encodeShareUrl(CODES, { ...DEFAULT_SETTINGS, speedPxPerSec: 300, seed: 7 }),
    );
  });

  it('redirects to setup when the URL has no valid codes', () => {
    mockPage.url = new URL('http://localhost/play?codes=bad');
    const { container } = render(PlayPage);
    expect(container.querySelector('.play')).toBeNull();
    expect(goto).toHaveBeenCalledWith('/?codes=bad', { replaceState: true });
  });
});
```

Run: `npx vitest run src/routes/play/page.test.ts`
Expected: FAIL — cannot resolve `./+page.svelte`.

- [ ] **Step 4: Write the play page**

`src/routes/play/+page.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/state';
  import { parseUpcList } from '$lib/upc';
  import { decodeShareUrl, encodeShareUrl } from '$lib/shareUrl';
  import { formatFinishMessage } from '$lib/format';
  import { DEFAULT_SETTINGS, type Settings } from '$lib/types';
  import ScrollColumn, { type ScrollColumnHandle } from '$lib/components/ScrollColumn.svelte';

  const OVERLAY_IDLE_MS = 3000;

  const decoded = decodeShareUrl(page.url.search);
  const settings: Settings = { ...DEFAULT_SETTINGS, ...decoded.settings };
  if (decoded.settings.seed === undefined) {
    settings.seed = Math.floor(Math.random() * 0x100000000) >>> 0;
  }
  const entries = parseUpcList(decoded.codes.join('\n'));
  const hasValid = entries.some((e) => e.valid);

  let column: ScrollColumnHandle | undefined = $state();
  let playing = $state(true);
  let speed = $state(settings.speedPxPerSec);
  let finish: { count: number; seconds: number } | null = $state(null);
  let overlayVisible = $state(true);
  let idleTimer: ReturnType<typeof setTimeout> | undefined;

  onMount(() => {
    if (!hasValid) {
      // Nothing scannable — bounce to setup, keeping whatever params were given.
      goto(`${base}/${page.url.search}`, { replaceState: true });
      return;
    }
    showOverlay();
    return () => clearTimeout(idleTimer);
  });

  function currentSettings(): Settings {
    return { ...settings, speedPxPerSec: speed };
  }
  function back(): void {
    goto(`${base}/${encodeShareUrl(entries.map((e) => e.raw), currentSettings())}`);
  }
  function toggle(): void {
    column?.toggle();
    playing = column?.isPlaying() ?? false;
  }
  function restart(): void {
    finish = null;
    column?.restart();
    playing = true;
  }
  function showOverlay(): void {
    overlayVisible = true;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => (overlayVisible = false), OVERLAY_IDLE_MS);
  }
</script>

<svelte:window onpointermove={showOverlay} onpointerdown={showOverlay} />

{#if hasValid}
  <div class="play">
    <ScrollColumn bind:this={column} {entries} {settings} onFinish={(s) => (finish = s)} />
    <div class="overlay" class:hidden={!overlayVisible}>
      <button type="button" class="ctl-playpause" onclick={toggle}>{playing ? 'Pause' : 'Play'}</button>
      <input
        type="range"
        class="ctl-speed"
        min="10"
        max="5000"
        step="5"
        bind:value={speed}
        oninput={() => column?.setSpeed(speed)}
      />
      <button type="button" class="ctl-restart" onclick={restart}>Restart</button>
      <button type="button" class="ctl-back" onclick={back}>Back</button>
    </div>
    {#if finish}
      <div class="finish-screen">
        <p class="finish-text">{formatFinishMessage(finish.count, finish.seconds)}</p>
        <button type="button" class="finish-restart" onclick={restart}>Restart</button>
        <button type="button" class="finish-back" onclick={back}>Back</button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .play { position: fixed; inset: 0; background: #fff; overflow: hidden; }
  .overlay {
    position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
    display: flex; gap: 12px; align-items: center;
    background: rgba(0, 0, 0, 0.7); color: #fff; padding: 10px 16px; border-radius: 8px;
    transition: opacity 0.3s; opacity: 1;
  }
  .overlay.hidden { opacity: 0; pointer-events: none; }
  .finish-screen {
    position: fixed; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 16px;
    background: #fff; font-size: 1.5rem;
  }
</style>
```

Note: `import ScrollColumn, { type ScrollColumnHandle } from ...` — the handle interface comes from ScrollColumn's `<script module>` block (Task 5).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/routes/play/page.test.ts src/lib/format.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Delete the superseded play view**

```bash
git rm src/lib/playView.ts src/lib/playView.test.ts
```

(Coverage accounting: `formatFinishMessage` exact-copy test moved to `format.test.ts`; render/onBack cases replaced by the play page tests.)

- [ ] **Step 7: Full suite and commit**

```bash
npm test
git add -A
git commit -m "feat: play page route replacing playView"
```

---

### Task 7: Trim global CSS, docs, and end-to-end verification

Component styles were copied into components in Tasks 2–6; the global sheet now shrinks to the reset (cleanup #5). Update the README and verify the built site end-to-end.

**Files:**
- Modify: `src/styles.css`, `README.md`

**Interfaces:**
- Consumes: everything from Tasks 1–6.
- Produces: the finished branch, ready for review/merge.

- [ ] **Step 1: Replace `src/styles.css` with the reset only**

```css
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; font-family: system-ui, sans-serif; }
```

(Deleted rules now live in: setup/start/settings → `src/routes/+page.svelte`; validation list → `ValidationList.svelte`; share/QR → `ShareLink.svelte`; play/overlay/finish → `src/routes/play/+page.svelte`; scroll column/track/copies/barcode items → `ScrollColumn.svelte`. The old `#app` rule is dead — Kit's body wrapper uses `display: contents`. The old `.finish-screen[hidden]` rule is dead — the finish screen is now an `{#if}` block.)

- [ ] **Step 2: Full suite**

Run: `npm test`
Expected: svelte-check 0 errors, all vitest suites PASS. If svelte-check reports "unused CSS selector" warnings in any component, fix by wrapping the selector part that targets imperative/`{@html}` DOM in `:global(...)` — do not delete the rule.

- [ ] **Step 3: Build and inspect the output**

```bash
npm run build
ls dist
```

Expected: `index.html`, `play.html` (the prerendered `/play` shell — GitHub Pages resolves `/scandible/play` to it), and `_app/`. Then:

```bash
grep -o '/scandible/_app' dist/index.html | head -1
```

Expected: `/scandible/_app` — confirms the production base path is baked in.

- [ ] **Step 4: Smoke-test the preview server**

```bash
npm run preview &
sleep 2
curl -s http://localhost:4173/scandible/ | grep -c '<title>scandible</title>'
curl -s -o /dev/null -w '%{http_code}' http://localhost:4173/scandible/play
kill %1
```

Expected: `1` from the first curl, `200` from the second.

- [ ] **Step 5: Update `README.md`**

In the **Tech stack** section, replace the first and third bullets so the list reads:

```markdown
- **SvelteKit** + **Svelte 5** (static-adapter SPA, TypeScript)
- **JsBarcode** for UPC-A barcode rendering (inline SVG)
- **Vitest** + **@testing-library/svelte** (jsdom) for unit tests
```

In the **Development** section, replace the `npm test` line's comment with `# svelte-check + Vitest suite (jsdom)`. In the **Deployment** section, replace the sentence beginning "Vite's `base` is..." with:

```markdown
SvelteKit's `paths.base` is `'/scandible'` in production builds for the project-site
subpath, adapter-static emits the site to `dist/`, and the repo's Pages source is set to
**GitHub Actions**.
```

- [ ] **Step 6: Verify the workflow needs no changes**

Read `.github/workflows/deploy.yml` and confirm: it runs `npm ci` (triggers `prepare` → `svelte-kit sync`), `npm test` (now includes svelte-check), `npm run build`, and uploads `dist` — all still correct because the adapter emits to `dist/`. No edit expected; if anything mismatches, fix the workflow to keep uploading `dist`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: move view styles into components, update docs for SvelteKit"
```

- [ ] **Step 8: Manual verification note for the human**

Report to the user: the port is complete on branch `sveltekit-port`; recommend a hands-on check with a real scanner against `npm run preview` (scroll smoothness, share links from the old deployed URL format, QR scan) before merging, since jsdom cannot verify visual scan quality.
