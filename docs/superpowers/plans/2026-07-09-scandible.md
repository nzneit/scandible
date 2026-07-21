# scandible Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static TypeScript web app that renders a list of UPC codes as barcodes in a vertical column and scrolls them continuously past the screen at an adjustable speed, so a physical barcode scanner can read each one in sequence.

**Architecture:** Vite + vanilla TypeScript single-page app with two modes (setup → fullscreen play), no router. Barcodes are inline SVGs (JsBarcode); motion is a `requestAnimationFrame` loop applying `transform: translateY(-offset)` to a container holding the sequence twice, with pure offset math extracted for unit testing. Deployed to GitHub Pages via GitHub Actions.

**Tech Stack:** Vite 5, TypeScript 5, Vitest 1 + jsdom, JsBarcode 3, GitHub Actions Pages.

**Source of truth:** `docs/superpowers/specs/2026-07-09-scandible-design.md`. Read it before starting.

## Global Constraints

These apply to every task; exact values copied from the spec.

- **Runtime dep:** `jsbarcode@^3.11.6`. **Dev deps:** `vite@^5`, `typescript@^5.4`, `vitest@^1.6`, `jsdom@^24`.
- **`package.json` scripts (verbatim):** `"dev": "vite"`, `"build": "vite build"`, `"preview": "vite preview"`, `"test": "vitest run"`.
- **Vite `base`:** `'/scandible/'` (GitHub Pages project subpath). Do not change.
- **All modules live in `src/`**; tests are colocated as `src/<name>.test.ts`.
- **Barcode symbology:** UPC-A only (`format: "upc"`), lenient — render what JsBarcode accepts, flag the rest.
- **Speed:** integer px/sec, `min=10`, `max=5000`, `step=5`, default `60`.
- **Frame delta:** milliseconds; first frame `0`; clamp to `100 ms` maximum.
- **Finish copy (verbatim):** `Finished scrolling {count} barcodes in {seconds} seconds` (seconds rounded to 1 decimal).
- **Every commit message ends with this trailer** (shown once here, applied to all commits):
  ```
  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  ```
- **jsdom caveat:** jsdom performs no layout (`getBoundingClientRect()` returns zeros). JsBarcode's text measurement needs a canvas 2D context, which jsdom returns as `null`; a global canvas stub (Task 1) supplies one so barcode rendering does not throw under tests. Layout-dependent behavior (repeat-period measurement, seamless wrap, real bar geometry, finish timing) is verified only in the browser (Task 12).

---

### Task 1: Project scaffold + types module

Establishes the toolchain (Vite build, Vitest+jsdom test runner, canvas stub) and the shared domain types. Deliverable: `npm install`, `npm run build`, and `npm test` all succeed with a passing types test.

**Files:**

- Create: `package.json`, `tsconfig.json`, `index.html`, `vite.config.ts`, `vitest.setup.ts`, `.gitignore`
- Create: `src/types.ts`, `src/main.ts` (stub, completed in Task 10)
- Test: `src/types.test.ts`

**Interfaces:**

- Produces: `UpcEntry { raw: string; value: string; valid: boolean }`, `Settings { speedPxPerSec: number; loop: boolean }`, `const DEFAULT_SETTINGS: Settings`.

- [ ] **Step 1: Create `package.json`**

```json
{
	"name": "scandible",
	"version": "0.1.0",
	"private": true,
	"type": "module",
	"scripts": {
		"dev": "vite",
		"build": "vite build",
		"preview": "vite preview",
		"test": "vitest run"
	},
	"dependencies": {
		"jsbarcode": "^3.11.6"
	},
	"devDependencies": {
		"jsdom": "^24.0.0",
		"typescript": "^5.4.0",
		"vite": "^5.2.0",
		"vitest": "^1.6.0"
	}
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
	"compilerOptions": {
		"target": "ES2020",
		"module": "ESNext",
		"moduleResolution": "bundler",
		"lib": ["ES2020", "DOM", "DOM.Iterable"],
		"strict": true,
		"noUnusedLocals": true,
		"noUnusedParameters": true,
		"skipLibCheck": true,
		"types": []
	},
	"include": ["src", "vite.config.ts", "vitest.setup.ts"]
}
```

- [ ] **Step 3: Create `index.html`** (Vite entry document at repo root)

```html
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>scandible</title>
	</head>
	<body>
		<div id="app"></div>
		<script type="module" src="/src/main.ts"></script>
	</body>
</html>
```

- [ ] **Step 4: Create `vite.config.ts`** (build base + Vitest jsdom config in one file)

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
	base: '/scandible/',
	test: {
		environment: 'jsdom',
		setupFiles: ['./vitest.setup.ts']
	}
});
```

- [ ] **Step 5: Create `vitest.setup.ts`** (canvas stub so JsBarcode does not throw under jsdom)

```ts
// jsdom returns null from canvas.getContext(); JsBarcode measures text through a 2D
// context and would throw "Cannot set properties of null (setting 'font')". Provide a
// minimal stub. Bar geometry is still meaningless under jsdom (no layout) — visual
// correctness is verified in the browser — but rendering no longer throws, so structural
// tests can run.
const stub = {
	font: '',
	fillStyle: '',
	textAlign: '',
	textBaseline: '',
	fillRect: () => {},
	fillText: () => {},
	measureText: () => ({ width: 0 }),
	beginPath: () => {},
	moveTo: () => {},
	lineTo: () => {},
	stroke: () => {},
	fill: () => {},
	save: () => {},
	restore: () => {},
	translate: () => {},
	scale: () => {}
};
// @ts-expect-error – deliberately overriding for the test environment
HTMLCanvasElement.prototype.getContext = () => stub;
```

- [ ] **Step 6: Create `.gitignore`**

```gitignore
node_modules
dist
```

- [ ] **Step 7: Create `src/main.ts` stub** (replaced in Task 10; needed now so `vite build` has an entry)

```ts
// Placeholder — real wiring lands in Task 10.
const app = document.getElementById('app');
if (app) app.textContent = 'scandible';
```

- [ ] **Step 8: Write the failing test** — `src/types.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS } from './types';

describe('DEFAULT_SETTINGS', () => {
	it('defaults to 60 px/s and loop off', () => {
		expect(DEFAULT_SETTINGS.speedPxPerSec).toBe(60);
		expect(DEFAULT_SETTINGS.loop).toBe(false);
	});
});
```

- [ ] **Step 9: Install dependencies, then run the test to verify it fails**

Run: `npm install && npx vitest run src/types.test.ts`
Expected: FAIL — `Failed to resolve import "./types"` (file does not exist yet).

- [ ] **Step 10: Create `src/types.ts`**

```ts
/** One parsed input entry. */
export interface UpcEntry {
	raw: string; // original token exactly as entered (post-trim)
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

- [ ] **Step 11: Run the test to verify it passes**

Run: `npx vitest run src/types.test.ts`
Expected: PASS (1 test).

- [ ] **Step 12: Verify the build and full test run**

Run: `npm run build && npm test`
Expected: `vite build` writes `dist/` with no errors; `vitest run` reports 1 passing test.

- [ ] **Step 13: Commit**

```bash
git add package.json tsconfig.json index.html vite.config.ts vitest.setup.ts .gitignore src/types.ts src/types.test.ts src/main.ts
git commit -m "chore: scaffold Vite+TS+Vitest project and add domain types"
```

---

### Task 2: Barcode module (`barcode.ts`)

UPC validity predicate + SVG renderer wrapping JsBarcode.

**Files:**

- Create: `src/barcode.ts`, `src/jsbarcode.d.ts`
- Test: `src/barcode.test.ts`

**Interfaces:**

- Consumes: `UpcEntry` from `./types`.
- Produces: `isRenderableUpc(value: string): boolean`, `renderBarcodeSvg(entry: UpcEntry): SVGElement`.

- [ ] **Step 1: Create the JsBarcode type shim** — `src/jsbarcode.d.ts`

```ts
declare module 'jsbarcode' {
	const JsBarcode: (element: unknown, data: string, options?: Record<string, unknown>) => void;
	export default JsBarcode;
}
```

- [ ] **Step 2: Write the failing test** — `src/barcode.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { isRenderableUpc, renderBarcodeSvg } from './barcode';

describe('isRenderableUpc', () => {
	it('accepts a valid 12-digit UPC-A', () => {
		expect(isRenderableUpc('036000291452')).toBe(true);
	});
	it('rejects too-short and non-numeric input', () => {
		expect(isRenderableUpc('12345')).toBe(false);
		expect(isRenderableUpc('notacode')).toBe(false);
	});
});

describe('renderBarcodeSvg', () => {
	it('returns an SVG element containing bar rects for a valid entry', () => {
		const svg = renderBarcodeSvg({ raw: '036000291452', value: '036000291452', valid: true });
		expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(svg.querySelectorAll('rect').length).toBeGreaterThan(0);
	});
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/barcode.test.ts`
Expected: FAIL — `Failed to resolve import "./barcode"`.

- [ ] **Step 4: Create `src/barcode.ts`**

```ts
import JsBarcode from 'jsbarcode';
import type { UpcEntry } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Does JsBarcode accept this value as UPC? Renders into a detached SVG with
 *  displayValue:false (a bare JsBarcode call throws on invalid input). Returns
 *  false on throw. displayValue:false avoids the text-measurement path. */
export function isRenderableUpc(value: string): boolean {
	const svg = document.createElementNS(SVG_NS, 'svg');
	try {
		JsBarcode(svg, value, { format: 'upc', displayValue: false });
		return true;
	} catch {
		return false;
	}
}

/** Render one VALID entry into a fresh SVG element (createElementNS, not
 *  createElement, to get the correct namespace). Draws the barcode with the
 *  human-readable number. Only ever called for entries where entry.valid === true. */
export function renderBarcodeSvg(entry: UpcEntry): SVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg');
	JsBarcode(svg, entry.value, {
		format: 'upc',
		displayValue: true,
		lineColor: '#000',
		background: '#fff',
		width: 3,
		height: 160,
		margin: 16
	});
	return svg;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/barcode.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/barcode.ts src/jsbarcode.d.ts src/barcode.test.ts
git commit -m "feat: add UPC validity predicate and SVG barcode renderer"
```

---

### Task 3: UPC input parsing (`upc.ts`)

Tokenize raw text into normalized, validated entries.

**Files:**

- Create: `src/upc.ts`
- Test: `src/upc.test.ts`

**Interfaces:**

- Consumes: `isRenderableUpc` from `./barcode`, `UpcEntry` from `./types`.
- Produces: `tokenizeUpcInput(raw: string): string[]`, `parseUpcList(raw: string): UpcEntry[]`.

- [ ] **Step 1: Write the failing test** — `src/upc.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { tokenizeUpcInput, parseUpcList } from './upc';

describe('tokenizeUpcInput', () => {
	it('splits on newlines and commas, trims, drops empties, keeps order + duplicates', () => {
		expect(tokenizeUpcInput(' a , b\n\nc ,,\nb ')).toEqual(['a', 'b', 'c', 'b']);
	});
});

describe('parseUpcList', () => {
	it('normalizes internal whitespace into value and flags validity', () => {
		const entries = parseUpcList('0360 0029 1452\n12345');
		expect(entries).toHaveLength(2);
		expect(entries[0]).toEqual({ raw: '0360 0029 1452', value: '036000291452', valid: true });
		expect(entries[1].valid).toBe(false);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/upc.test.ts`
Expected: FAIL — `Failed to resolve import "./upc"`.

- [ ] **Step 3: Create `src/upc.ts`**

```ts
import { isRenderableUpc } from './barcode';
import type { UpcEntry } from './types';

/** Split raw text into cleaned tokens: split on newlines AND commas, trim each,
 *  drop empties. Order and duplicates preserved. */
export function tokenizeUpcInput(raw: string): string[] {
	return raw
		.split(/[\n,]/)
		.map((t) => t.trim())
		.filter((t) => t.length > 0);
}

function normalize(token: string): string {
	return token.trim().replace(/\s+/g, '');
}

/** Tokenize + normalize + validate each token. */
export function parseUpcList(raw: string): UpcEntry[] {
	return tokenizeUpcInput(raw).map((token) => {
		const value = normalize(token);
		return { raw: token, value, valid: isRenderableUpc(value) };
	});
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/upc.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/upc.ts src/upc.test.ts
git commit -m "feat: add UPC tokenizer and list parser"
```

---

### Task 4: File reading (`fileInput.ts`)

Read an uploaded `.txt`/`.csv` file to text.

**Files:**

- Create: `src/fileInput.ts`
- Test: `src/fileInput.test.ts`

**Interfaces:**

- Produces: `readUpcFile(file: File): Promise<string>`.

- [ ] **Step 1: Write the failing test** — `src/fileInput.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { readUpcFile } from './fileInput';

describe('readUpcFile', () => {
	it('resolves with the file text', async () => {
		const file = new File(['036000291452\n012345678905'], 'codes.txt', { type: 'text/plain' });
		await expect(readUpcFile(file)).resolves.toBe('036000291452\n012345678905');
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/fileInput.test.ts`
Expected: FAIL — `Failed to resolve import "./fileInput"`.

- [ ] **Step 3: Create `src/fileInput.ts`**

```ts
/** Read an uploaded .txt/.csv File as text via FileReader. Rejects on read error.
 *  The returned text is fed to upc.tokenizeUpcInput — CSV is treated as plain
 *  comma/newline-separated tokens (no column semantics). */
export function readUpcFile(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result ?? ''));
		reader.onerror = () => reject(reader.error ?? new Error('File read failed'));
		reader.readAsText(file);
	});
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/fileInput.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/fileInput.ts src/fileInput.test.ts
git commit -m "feat: add uploaded-file reader"
```

---

### Task 5: Share URL round-trip (`shareUrl.ts`)

Encode/decode the code list + settings to/from the query string.

**Files:**

- Create: `src/shareUrl.ts`
- Test: `src/shareUrl.test.ts`

**Interfaces:**

- Consumes: `Settings` from `./types`.
- Produces: `encodeShareUrl(codes: string[], settings: Settings): string`, `decodeShareUrl(search: string): { codes: string[]; settings: Partial<Settings> }`.

- [ ] **Step 1: Write the failing test** — `src/shareUrl.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { encodeShareUrl, decodeShareUrl } from './shareUrl';

describe('shareUrl', () => {
	it('round-trips codes and settings', () => {
		const search = encodeShareUrl(['036000291452', '012345678905'], {
			speedPxPerSec: 120,
			loop: true
		});
		expect(decodeShareUrl(search)).toEqual({
			codes: ['036000291452', '012345678905'],
			settings: { speedPxPerSec: 120, loop: true }
		});
	});

	it('is lenient per parameter and never throws', () => {
		expect(decodeShareUrl('')).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl('?speed=abc&loop=2')).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl('?speed=99999')).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl('?loop=1')).toEqual({ codes: [], settings: { loop: true } });
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/shareUrl.test.ts`
Expected: FAIL — `Failed to resolve import "./shareUrl"`.

- [ ] **Step 3: Create `src/shareUrl.ts`**

```ts
import type { Settings } from './types';

const SPEED_MIN = 10;
const SPEED_MAX = 5000;

/** Build "?codes=...&speed=...&loop=..." from raw code strings + settings. codes are
 *  joined with "\n" so internal commas/whitespace survive URLSearchParams encoding. */
export function encodeShareUrl(codes: string[], settings: Settings): string {
	const params = new URLSearchParams();
	params.set('codes', codes.join('\n'));
	params.set('speed', String(settings.speedPxPerSec));
	params.set('loop', settings.loop ? '1' : '0');
	return '?' + params.toString();
}

/** Parse location.search into codes + partial settings. Per-parameter leniency,
 *  never throws. */
export function decodeShareUrl(search: string): { codes: string[]; settings: Partial<Settings> } {
	const params = new URLSearchParams(search);
	const codesRaw = params.get('codes');
	const codes = codesRaw
		? codesRaw
				.split('\n')
				.map((c) => c.trim())
				.filter((c) => c.length > 0)
		: [];

	const settings: Partial<Settings> = {};
	const speedRaw = params.get('speed');
	if (speedRaw !== null) {
		const speed = Number(speedRaw);
		if (Number.isFinite(speed) && speed >= SPEED_MIN && speed <= SPEED_MAX) {
			settings.speedPxPerSec = speed;
		}
	}
	const loopRaw = params.get('loop');
	if (loopRaw === '0' || loopRaw === '1') {
		settings.loop = loopRaw === '1';
	}
	return { codes, settings };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/shareUrl.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/shareUrl.ts src/shareUrl.test.ts
git commit -m "feat: add shareable-URL encode/decode"
```

---

### Task 6: Pure scroll math (`scrollMath.ts`)

Frame-advance and end-detection math, DOM-free and fully unit-testable.

**Files:**

- Create: `src/scrollMath.ts`
- Test: `src/scrollMath.test.ts`

**Interfaces:**

- Produces: `advanceOffset(offset, speedPxPerSec, deltaMs, contentHeight, loop): number`, `isAtEnd(offset, contentHeight, loop): boolean`.

- [ ] **Step 1: Write the failing test** — `src/scrollMath.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { advanceOffset, isAtEnd } from './scrollMath';

describe('advanceOffset', () => {
	it('advances by speed × seconds', () => {
		expect(advanceOffset(0, 100, 500, 1000, false)).toBe(50); // 100px/s * 0.5s
	});
	it('does not move when deltaMs is 0 (paused)', () => {
		expect(advanceOffset(42, 100, 0, 1000, false)).toBe(42);
	});
	it('wraps modulo contentHeight when looping', () => {
		expect(advanceOffset(450, 100, 1000, 500, true)).toBe(50); // 550 % 500
	});
	it('clamps at contentHeight when not looping', () => {
		expect(advanceOffset(450, 100, 1000, 500, false)).toBe(500); // min(550, 500)
	});
});

describe('isAtEnd', () => {
	it('is true only for a non-looping scroll at/after contentHeight', () => {
		expect(isAtEnd(500, 500, false)).toBe(true);
		expect(isAtEnd(499, 500, false)).toBe(false);
		expect(isAtEnd(500, 500, true)).toBe(false);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/scrollMath.test.ts`
Expected: FAIL — `Failed to resolve import "./scrollMath"`.

- [ ] **Step 3: Create `src/scrollMath.ts`**

```ts
/** Advance the scroll offset by one frame. Pure — no DOM, no time source.
 *  deltaMs is MILLISECONDS (already clamped by the caller). */
export function advanceOffset(
	offset: number,
	speedPxPerSec: number,
	deltaMs: number,
	contentHeight: number,
	loop: boolean
): number {
	const delta = speedPxPerSec * (deltaMs / 1000);
	const next = offset + delta;
	if (loop) {
		return contentHeight > 0 ? next % contentHeight : 0;
	}
	return Math.min(next, contentHeight);
}

/** True when a non-looping scroll has reached the end (offset >= contentHeight). */
export function isAtEnd(offset: number, contentHeight: number, loop: boolean): boolean {
	return !loop && offset >= contentHeight;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/scrollMath.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scrollMath.ts src/scrollMath.test.ts
git commit -m "feat: add pure scroll-offset math"
```

---

### Task 7: Scroll engine (`scroller.ts`)

Builds the two-copy barcode column, runs the rAF loop, exposes playback controls, fires `onFinish`.

**Files:**

- Create: `src/scroller.ts`
- Test: `src/scroller.test.ts`

**Interfaces:**

- Consumes: `advanceOffset`, `isAtEnd` from `./scrollMath`; `renderBarcodeSvg` from `./barcode`; `Settings`, `UpcEntry` from `./types`.
- Produces: `interface Scroller { play(); pause(); toggle(); restart(); setSpeed(pxPerSec: number); setLoop(loop: boolean); isPlaying(): boolean; destroy(); }`, `createScroller(container: HTMLElement, entries: UpcEntry[], settings: Settings, onFinish?: (s: { count: number; seconds: number }) => void): Scroller`. Renders only valid entries; the column DOM is `.scroller-track > .scroller-copy > .barcode-item > svg`; copy 2 is `display:none` unless loop is on. Starts **paused**.

- [ ] **Step 1: Write the failing test** — `src/scroller.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createScroller } from './scroller';
import type { UpcEntry } from './types';

const entry = (value: string, valid: boolean): UpcEntry => ({ raw: value, value, valid });
const entries: UpcEntry[] = [
	entry('036000291452', true),
	entry('bad', false),
	entry('012345678905', true)
];

let container: HTMLElement;
beforeEach(() => {
	container = document.createElement('div');
	document.body.appendChild(container);
});

describe('createScroller', () => {
	it('renders two copies of the valid entries only, and starts paused', () => {
		const s = createScroller(container, entries, { speedPxPerSec: 60, loop: false });
		// 2 valid entries × 2 copies = 4 barcode items
		expect(container.querySelectorAll('.barcode-item').length).toBe(4);
		expect(s.isPlaying()).toBe(false);
		s.destroy();
	});

	it('hides copy 2 when loop is off and shows it when on', () => {
		const s = createScroller(container, entries, { speedPxPerSec: 60, loop: false });
		const copies = container.querySelectorAll<HTMLElement>('.scroller-copy');
		expect(copies[1].style.display).toBe('none');
		s.setLoop(true);
		expect(copies[1].style.display).toBe('');
		s.setLoop(false);
		expect(copies[1].style.display).toBe('none');
		s.destroy();
	});

	it('play() and pause() flip the playing state', () => {
		const s = createScroller(container, entries, { speedPxPerSec: 60, loop: true });
		s.play();
		expect(s.isPlaying()).toBe(true);
		s.pause();
		expect(s.isPlaying()).toBe(false);
		s.destroy();
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/scroller.test.ts`
Expected: FAIL — `Failed to resolve import "./scroller"`.

- [ ] **Step 3: Create `src/scroller.ts`**

```ts
import { advanceOffset, isAtEnd } from './scrollMath';
import { renderBarcodeSvg } from './barcode';
import type { Settings, UpcEntry } from './types';

const MAX_DELTA_MS = 100;

export interface Scroller {
	play(): void;
	pause(): void;
	toggle(): void;
	restart(): void;
	setSpeed(pxPerSec: number): void;
	setLoop(loop: boolean): void;
	isPlaying(): boolean;
	destroy(): void;
}

export function createScroller(
	container: HTMLElement,
	entries: UpcEntry[],
	settings: Settings,
	onFinish?: (summary: { count: number; seconds: number }) => void
): Scroller {
	const valid = entries.filter((e) => e.valid);
	const count = valid.length;

	const buildCopy = (): HTMLElement => {
		const copy = document.createElement('div');
		copy.className = 'scroller-copy';
		for (const e of valid) {
			const item = document.createElement('div');
			item.className = 'barcode-item';
			item.appendChild(renderBarcodeSvg(e));
			copy.appendChild(item);
		}
		return copy;
	};

	const track = document.createElement('div');
	track.className = 'scroller-track';
	const copy1 = buildCopy();
	const copy2 = buildCopy();
	track.appendChild(copy1);
	track.appendChild(copy2);
	container.innerHTML = '';
	container.appendChild(track);

	let speed = settings.speedPxPerSec;
	let loop = settings.loop;
	let offset = 0;
	let elapsedMs = 0;
	let playing = false;
	let rafId: number | null = null;
	let lastTs: number | null = null;
	let contentHeight = 0;

	const applyLoopVisibility = () => {
		copy2.style.display = loop ? '' : 'none';
	};
	const render = () => {
		track.style.transform = `translateY(${-offset}px)`;
	};
	const measure = () => {
		const a = copy1.firstElementChild as HTMLElement | null;
		const b = copy2.firstElementChild as HTMLElement | null;
		if (a && b) {
			contentHeight = b.getBoundingClientRect().top - a.getBoundingClientRect().top;
		}
	};

	const stop = () => {
		playing = false;
		if (rafId !== null) cancelAnimationFrame(rafId);
		rafId = null;
	};
	const frame = (ts: number) => {
		if (!playing) return;
		let deltaMs = lastTs === null ? 0 : ts - lastTs;
		lastTs = ts;
		if (deltaMs > MAX_DELTA_MS) deltaMs = MAX_DELTA_MS;
		if (deltaMs > 0) {
			offset = advanceOffset(offset, speed, deltaMs, contentHeight, loop);
			elapsedMs += deltaMs;
			render();
		}
		if (isAtEnd(offset, contentHeight, loop)) {
			stop();
			onFinish?.({ count, seconds: Math.round((elapsedMs / 1000) * 10) / 10 });
			return;
		}
		rafId = requestAnimationFrame(frame);
	};
	const start = () => {
		if (playing) return;
		playing = true;
		lastTs = null;
		rafId = requestAnimationFrame(frame);
	};

	const onResize = () => {
		measure();
		offset = loop
			? contentHeight > 0
				? offset % contentHeight
				: 0
			: Math.min(offset, contentHeight);
		render();
	};
	window.addEventListener('resize', onResize);

	applyLoopVisibility();
	measure();
	render();

	return {
		play: start,
		pause: stop,
		toggle() {
			if (playing) stop();
			else start();
		},
		restart() {
			offset = 0;
			elapsedMs = 0;
			render();
			stop();
			start();
		},
		setSpeed(pxPerSec) {
			speed = pxPerSec;
		},
		setLoop(next) {
			loop = next;
			applyLoopVisibility();
			if (loop && contentHeight > 0) offset = offset % contentHeight;
			render();
		},
		isPlaying() {
			return playing;
		},
		destroy() {
			stop();
			window.removeEventListener('resize', onResize);
		}
	};
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/scroller.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scroller.ts src/scroller.test.ts
git commit -m "feat: add continuous-scroll engine with loop and finish"
```

---

### Task 8: Setup view (`setupView.ts`)

The setup screen: input, validation list, settings, share link, Start.

**Files:**

- Create: `src/setupView.ts`
- Test: `src/setupView.test.ts`

**Interfaces:**

- Consumes: `parseUpcList` from `./upc`; `readUpcFile` from `./fileInput`; `encodeShareUrl` from `./shareUrl`; `DEFAULT_SETTINGS`, `Settings`, `UpcEntry` from `./types`.
- Produces: `mountSetupView(root: HTMLElement, initial: { codes: string[]; settings: Partial<Settings> }, onStart: (entries: UpcEntry[], settings: Settings) => void): void`. DOM contains `.upc-input` (textarea), `.file-input`, `.speed-input`, `.loop-input`, `.validation-list`, `.copy-link`, `.share-url`, `.url-warning`, `.start`.

- [ ] **Step 1: Write the failing test** — `src/setupView.test.ts`

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mountSetupView } from './setupView';

let root: HTMLElement;
beforeEach(() => {
	root = document.createElement('div');
	document.body.appendChild(root);
});

const q = <T extends Element>(sel: string) => root.querySelector(sel) as T;

describe('mountSetupView', () => {
	it('prefills the textarea and settings from initial state', () => {
		mountSetupView(
			root,
			{ codes: ['036000291452'], settings: { speedPxPerSec: 120, loop: true } },
			() => {}
		);
		expect(q<HTMLTextAreaElement>('.upc-input').value).toBe('036000291452');
		expect(q<HTMLInputElement>('.speed-input').value).toBe('120');
		expect(q<HTMLInputElement>('.loop-input').checked).toBe(true);
	});

	it('flags invalid entries and disables Start until there is a valid one', () => {
		mountSetupView(root, { codes: [], settings: {} }, () => {});
		const input = q<HTMLTextAreaElement>('.upc-input');
		const start = q<HTMLButtonElement>('.start');
		expect(start.disabled).toBe(true);

		input.value = 'bad';
		input.dispatchEvent(new Event('input'));
		expect(root.querySelectorAll('.validation-list li').length).toBe(1);
		expect(root.querySelector('.validation-list li')?.classList.contains('invalid')).toBe(true);
		expect(start.disabled).toBe(true);

		input.value = 'bad\n036000291452';
		input.dispatchEvent(new Event('input'));
		expect(start.disabled).toBe(false);
	});

	it('calls onStart with parsed entries and current settings', () => {
		const onStart = vi.fn();
		mountSetupView(
			root,
			{ codes: ['036000291452'], settings: { speedPxPerSec: 60, loop: false } },
			onStart
		);
		q<HTMLButtonElement>('.start').click();
		expect(onStart).toHaveBeenCalledTimes(1);
		const [entries, settings] = onStart.mock.calls[0];
		expect(entries).toHaveLength(1);
		expect(entries[0].valid).toBe(true);
		expect(settings).toEqual({ speedPxPerSec: 60, loop: false });
	});

	it('builds a share URL into .share-url on Copy link', () => {
		mountSetupView(
			root,
			{ codes: ['036000291452'], settings: { speedPxPerSec: 60, loop: false } },
			() => {}
		);
		q<HTMLButtonElement>('.copy-link').click();
		expect(q<HTMLInputElement>('.share-url').value).toContain('codes=036000291452');
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/setupView.test.ts`
Expected: FAIL — `Failed to resolve import "./setupView"`.

- [ ] **Step 3: Create `src/setupView.ts`**

```ts
import { parseUpcList } from './upc';
import { readUpcFile } from './fileInput';
import { encodeShareUrl } from './shareUrl';
import { DEFAULT_SETTINGS, type Settings, type UpcEntry } from './types';

const URL_WARN_LENGTH = 2000;

export function mountSetupView(
	root: HTMLElement,
	initial: { codes: string[]; settings: Partial<Settings> },
	onStart: (entries: UpcEntry[], settings: Settings) => void
): void {
	const settings: Settings = { ...DEFAULT_SETTINGS, ...initial.settings };

	root.innerHTML = `
    <div class="setup">
      <h1>scandible</h1>
      <textarea class="upc-input" rows="8" placeholder="Paste UPC codes, one per line"></textarea>
      <input type="file" class="file-input" accept=".txt,.csv" />
      <div class="settings-row">
        <label>Speed
          <input type="range" class="speed-input" min="10" max="2000" step="5" />
        </label>
        <label><input type="checkbox" class="loop-input" /> Loop</label>
      </div>
      <ul class="validation-list"></ul>
      <div class="share-row">
        <button type="button" class="copy-link">Copy link</button>
        <input type="text" class="share-url" readonly />
        <span class="url-warning" hidden>Link is long; it may be truncated by some browsers.</span>
      </div>
      <button type="button" class="start" disabled>Start</button>
    </div>
  `;

	const input = root.querySelector('.upc-input') as HTMLTextAreaElement;
	const fileInput = root.querySelector('.file-input') as HTMLInputElement;
	const speedInput = root.querySelector('.speed-input') as HTMLInputElement;
	const loopInput = root.querySelector('.loop-input') as HTMLInputElement;
	const list = root.querySelector('.validation-list') as HTMLUListElement;
	const copyLink = root.querySelector('.copy-link') as HTMLButtonElement;
	const shareUrl = root.querySelector('.share-url') as HTMLInputElement;
	const urlWarning = root.querySelector('.url-warning') as HTMLElement;
	const start = root.querySelector('.start') as HTMLButtonElement;

	input.value = initial.codes.join('\n');
	speedInput.value = String(settings.speedPxPerSec);
	loopInput.checked = settings.loop;

	let entries: UpcEntry[] = [];

	const currentSettings = (): Settings => ({
		speedPxPerSec: Number(speedInput.value),
		loop: loopInput.checked
	});

	const refresh = () => {
		entries = parseUpcList(input.value);
		list.innerHTML = '';
		for (const e of entries) {
			const li = document.createElement('li');
			li.className = e.valid ? 'valid' : 'invalid';
			li.textContent = `${e.raw} ${e.valid ? '✓' : '✗ invalid'}`;
			list.appendChild(li);
		}
		start.disabled = !entries.some((e) => e.valid);
	};

	input.addEventListener('input', refresh);

	fileInput.addEventListener('change', async () => {
		const file = fileInput.files?.[0];
		if (!file) return;
		try {
			input.value = await readUpcFile(file);
			refresh();
		} catch {
			list.innerHTML = '<li class="invalid">Could not read file</li>';
		}
	});

	copyLink.addEventListener('click', () => {
		const url =
			location.origin +
			location.pathname +
			encodeShareUrl(
				entries.map((e) => e.raw),
				currentSettings()
			);
		shareUrl.value = url;
		urlWarning.hidden = url.length <= URL_WARN_LENGTH;
		void navigator.clipboard?.writeText(url).catch(() => {});
	});

	start.addEventListener('click', () => {
		if (start.disabled) return;
		onStart(entries, currentSettings());
	});

	refresh();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/setupView.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/setupView.ts src/setupView.test.ts
git commit -m "feat: add setup view with validation, share link, and start"
```

---

### Task 9: Play view (`playView.ts`)

Fullscreen scroller + auto-hiding overlay + finish screen.

**Files:**

- Create: `src/playView.ts`
- Test: `src/playView.test.ts`

**Interfaces:**

- Consumes: `createScroller` from `./scroller`; `Settings`, `UpcEntry` from `./types`.
- Produces: `formatFinishMessage(count: number, seconds: number): string`, `mountPlayView(root: HTMLElement, entries: UpcEntry[], settings: Settings, onBack: () => void): void`. Overlay controls: `.ctl-playpause`, `.ctl-speed`, `.ctl-restart`, `.ctl-back`; finish screen `.finish-screen` (starts `hidden`) with `.finish-text` and `.finish-restart` / `.finish-back`.

- [ ] **Step 1: Write the failing test** — `src/playView.test.ts`

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mountPlayView, formatFinishMessage } from './playView';
import type { UpcEntry } from './types';

const entry = (value: string, valid: boolean): UpcEntry => ({ raw: value, value, valid });
const entries: UpcEntry[] = [
	entry('036000291452', true),
	entry('bad', false),
	entry('012345678905', true)
];

let root: HTMLElement;
beforeEach(() => {
	root = document.createElement('div');
	document.body.appendChild(root);
});

describe('formatFinishMessage', () => {
	it('formats the finish copy exactly', () => {
		expect(formatFinishMessage(3, 12.4)).toBe('Finished scrolling 3 barcodes in 12.4 seconds');
	});
});

describe('mountPlayView', () => {
	it('renders the scroller column and overlay controls, finish hidden', () => {
		mountPlayView(root, entries, { speedPxPerSec: 60, loop: false }, () => {});
		expect(root.querySelectorAll('.barcode-item').length).toBe(4); // 2 valid × 2 copies
		expect(root.querySelector('.ctl-playpause')).not.toBeNull();
		expect(root.querySelector('.ctl-speed')).not.toBeNull();
		expect((root.querySelector('.finish-screen') as HTMLElement).hidden).toBe(true);
	});

	it('calls onBack when the back button is clicked', () => {
		const onBack = vi.fn();
		mountPlayView(root, entries, { speedPxPerSec: 60, loop: false }, onBack);
		(root.querySelector('.ctl-back') as HTMLButtonElement).click();
		expect(onBack).toHaveBeenCalledTimes(1);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/playView.test.ts`
Expected: FAIL — `Failed to resolve import "./playView"`.

- [ ] **Step 3: Create `src/playView.ts`**

```ts
import { createScroller } from './scroller';
import type { Settings, UpcEntry } from './types';

const OVERLAY_IDLE_MS = 2000;

export function formatFinishMessage(count: number, seconds: number): string {
	return `Finished scrolling ${count} barcodes in ${seconds} seconds`;
}

export function mountPlayView(
	root: HTMLElement,
	entries: UpcEntry[],
	settings: Settings,
	onBack: () => void
): void {
	root.innerHTML = `
    <div class="play">
      <div class="scroll-column"></div>
      <div class="overlay">
        <button type="button" class="ctl-playpause">Pause</button>
        <input type="range" class="ctl-speed" min="10" max="3000" step="5" />
        <button type="button" class="ctl-restart">Restart</button>
        <button type="button" class="ctl-back">Back</button>
      </div>
      <div class="finish-screen" hidden>
        <p class="finish-text"></p>
        <button type="button" class="finish-restart">Restart</button>
        <button type="button" class="finish-back">Back</button>
      </div>
    </div>
  `;

	const column = root.querySelector('.scroll-column') as HTMLElement;
	const overlay = root.querySelector('.overlay') as HTMLElement;
	const playpause = root.querySelector('.ctl-playpause') as HTMLButtonElement;
	const speed = root.querySelector('.ctl-speed') as HTMLInputElement;
	const restart = root.querySelector('.ctl-restart') as HTMLButtonElement;
	const back = root.querySelector('.ctl-back') as HTMLButtonElement;
	const finish = root.querySelector('.finish-screen') as HTMLElement;
	const finishText = root.querySelector('.finish-text') as HTMLElement;
	const finishRestart = root.querySelector('.finish-restart') as HTMLButtonElement;
	const finishBack = root.querySelector('.finish-back') as HTMLButtonElement;

	speed.value = String(settings.speedPxPerSec);

	const scroller = createScroller(column, entries, settings, ({ count, seconds }) => {
		finishText.textContent = formatFinishMessage(count, seconds);
		finish.hidden = false;
	});

	const syncPlayLabel = () => {
		playpause.textContent = scroller.isPlaying() ? 'Pause' : 'Play';
	};

	playpause.addEventListener('click', () => {
		scroller.toggle();
		syncPlayLabel();
	});
	speed.addEventListener('input', () => scroller.setSpeed(Number(speed.value)));
	const doRestart = () => {
		finish.hidden = true;
		scroller.restart();
		syncPlayLabel();
	};
	restart.addEventListener('click', doRestart);
	finishRestart.addEventListener('click', doRestart);
	back.addEventListener('click', onBack);
	finishBack.addEventListener('click', onBack);

	// Auto-hide overlay after idle; reappear on interaction.
	let idleTimer: ReturnType<typeof setTimeout>;
	const showOverlay = () => {
		overlay.classList.remove('hidden');
		clearTimeout(idleTimer);
		idleTimer = setTimeout(() => overlay.classList.add('hidden'), OVERLAY_IDLE_MS);
	};
	root.addEventListener('pointermove', showOverlay);
	root.addEventListener('pointerdown', showOverlay);

	scroller.play();
	syncPlayLabel();
	showOverlay();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/playView.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/playView.ts src/playView.test.ts
git commit -m "feat: add fullscreen play view with overlay and finish screen"
```

---

### Task 10: App wiring + styles (`main.ts`, `styles.css`)

Mode switching, URL bootstrap, and the stylesheet.

**Files:**

- Modify: `src/main.ts` (replace the Task 1 stub)
- Create: `src/styles.css`
- Test: `src/main.test.ts`

**Interfaces:**

- Consumes: `decodeShareUrl` from `./shareUrl`; `parseUpcList` from `./upc`; `mountSetupView` from `./setupView`; `mountPlayView` from `./playView`; `DEFAULT_SETTINGS`, `Settings`, `UpcEntry` from `./types`.
- Produces: `startApp(root: HTMLElement, search: string): void` (exported for tests; also invoked on load).

- [ ] **Step 1: Write the failing test** — `src/main.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { startApp } from './main';

let root: HTMLElement;
beforeEach(() => {
	root = document.createElement('div');
	document.body.appendChild(root);
});

describe('startApp', () => {
	it('opens setup prefilled from the URL', () => {
		startApp(root, '?codes=036000291452&speed=120&loop=1');
		const ta = root.querySelector('.upc-input') as HTMLTextAreaElement;
		expect(ta.value).toBe('036000291452');
		expect((root.querySelector('.speed-input') as HTMLInputElement).value).toBe('120');
	});

	it('switches to play mode on Start and back on Back', () => {
		startApp(root, '?codes=036000291452');
		(root.querySelector('.start') as HTMLButtonElement).click();
		expect(root.querySelector('.play')).not.toBeNull();
		(root.querySelector('.ctl-back') as HTMLButtonElement).click();
		expect(root.querySelector('.setup')).not.toBeNull();
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/main.test.ts`
Expected: FAIL — `startApp` is not exported (current `main.ts` is the stub).

- [ ] **Step 3: Replace `src/main.ts`**

```ts
import './styles.css';
import { decodeShareUrl } from './shareUrl';
import { parseUpcList } from './upc';
import { mountSetupView } from './setupView';
import { mountPlayView } from './playView';
import { DEFAULT_SETTINGS, type Settings, type UpcEntry } from './types';

export function startApp(root: HTMLElement, search: string): void {
	const decoded = decodeShareUrl(search);
	let entries: UpcEntry[] = parseUpcList(decoded.codes.join('\n'));
	let settings: Settings = { ...DEFAULT_SETTINGS, ...decoded.settings };

	const showSetup = () => {
		mountSetupView(root, { codes: entries.map((e) => e.raw), settings }, (e, s) => {
			entries = e;
			settings = s;
			showPlay();
		});
	};
	const showPlay = () => {
		mountPlayView(root, entries, settings, showSetup);
	};

	showSetup();
}

const appRoot = document.getElementById('app');
if (appRoot) startApp(appRoot, location.search);
```

- [ ] **Step 4: Create `src/styles.css`**

```css
* {
	box-sizing: border-box;
}
html,
body {
	margin: 0;
	height: 100%;
	font-family: system-ui, sans-serif;
}
#app {
	min-height: 100%;
}

/* Setup */
.setup {
	max-width: 640px;
	margin: 0 auto;
	padding: 24px;
	display: flex;
	flex-direction: column;
	gap: 12px;
}
.upc-input {
	width: 100%;
	font-family: monospace;
}
.validation-list {
	list-style: none;
	padding: 0;
	margin: 0;
	max-height: 200px;
	overflow: auto;
}
.validation-list .valid {
	color: #0a0;
}
.validation-list .invalid {
	color: #c00;
}
.share-url {
	flex: 1;
	font-family: monospace;
}
.start {
	padding: 12px;
	font-size: 1.1rem;
}
.start:disabled {
	opacity: 0.5;
}

/* Play */
.play {
	position: fixed;
	inset: 0;
	background: #fff;
	overflow: hidden;
}
.scroll-column {
	position: absolute;
	inset: 0;
	display: flex;
	justify-content: center;
}
/* Seam-uniform rhythm: equal top+bottom padding per barcode, no last-item margin,
   no collapsing margins — so the copy1/copy2 gap equals the internal gap. */
.scroller-track {
	display: flex;
	flex-direction: column;
}
.scroller-copy {
	display: flex;
	flex-direction: column;
}
.barcode-item {
	display: flex;
	justify-content: center;
	padding: 40vh 0; /* generous: isolates one barcode in the scan zone */
}
.barcode-item svg {
	max-width: min(90vw, 640px);
	height: auto;
}

/* Overlay */
.overlay {
	position: fixed;
	bottom: 16px;
	left: 50%;
	transform: translateX(-50%);
	display: flex;
	gap: 12px;
	align-items: center;
	background: rgba(0, 0, 0, 0.7);
	color: #fff;
	padding: 10px 16px;
	border-radius: 8px;
	transition: opacity 0.3s;
	opacity: 1;
}
.overlay.hidden {
	opacity: 0;
	pointer-events: none;
}

/* Finish */
.finish-screen {
	position: fixed;
	inset: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 16px;
	background: #fff;
	font-size: 1.5rem;
}
.finish-screen[hidden] {
	display: none;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/main.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Run the full suite and build**

Run: `npm test && npm run build`
Expected: all tests pass; `vite build` succeeds and emits `dist/` with `/scandible/` asset paths.

- [ ] **Step 7: Commit**

```bash
git add src/main.ts src/styles.css src/main.test.ts
git commit -m "feat: wire setup/play mode switching, URL bootstrap, and styles"
```

---

### Task 11: GitHub Pages deploy workflow

CI that tests, builds, and deploys to GitHub Pages on push to `main`.

**Files:**

- Create: `.github/workflows/deploy.yml`

**Interfaces:** none (infrastructure).

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Validate the YAML parses**

Run: `node -e "require('fs').readFileSync('.github/workflows/deploy.yml','utf8')" && python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/deploy.yml')); print('YAML OK')"`
Expected: prints `YAML OK` (no parse error). If `python3`/`yaml` is unavailable, visually confirm indentation matches the block above.

- [ ] **Step 3: Note the one-time repo setting (manual, cannot be scripted here)**

Before the first run succeeds, a maintainer must set **Settings → Pages → Source = GitHub Actions** in the GitHub repo. Record this in the commit body.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Pages deploy workflow

Requires a one-time repo setting: Settings > Pages > Source = GitHub Actions."
```

---

### Task 12: Browser smoke verification (layout, visual, motion, finish)

jsdom cannot exercise layout, seamless looping, real bar geometry, or finish timing. Verify these in a real browser against the built app. No code changes; this task gates "done".

**Files:** none (manual verification).

- [ ] **Step 1: Build and serve the production bundle**

Run: `npm run build && npm run preview`
Expected: preview server prints a local URL (served under the `/scandible/` base).

- [ ] **Step 2: Verify setup → play**

Open the preview URL. Paste several UPCs including one invalid (e.g. `bad`). Confirm the invalid one is flagged in the validation list. Set a slow speed, leave Loop off, click **Start**.
Expected: fullscreen white view; only valid barcodes scroll upward; the invalid code does **not** appear in the scroll.

- [ ] **Step 3: Verify scanning legibility and single-in-zone spacing**

Watch the scroll (or point a scanner/phone scanner app at it).
Expected: bars are crisp black-on-white; only one barcode occupies the center scan zone at a time; a scanner reads each in turn.

- [ ] **Step 4: Verify loop seam**

Return (Back), enable **Loop**, Start again, let it wrap past the end at least twice.
Expected: no visible hop/jump at the wrap point; the sequence repeats seamlessly.

- [ ] **Step 5: Verify finish screen (loop off)**

Back, disable Loop, Start, let it run to the end.
Expected: after the last barcode scrolls off, a centered screen reads `Finished scrolling N barcodes in X seconds` (N = number of valid codes). Click **Restart** → scrolling resumes from the top; click **Back** → returns to setup.

- [ ] **Step 6: Verify share link round-trip**

In setup, click **Copy link**, open the copied URL in a new tab.
Expected: setup opens prefilled with the same codes, speed, and loop setting.

- [ ] **Step 7: Record the verification outcome**

If every check passes, the implementation is complete. If any fails, open a focused fix (with a regression test where the failure is unit-testable) before marking done.

---

## Self-Review

**1. Spec coverage:**

- Two modes (setup → play): Tasks 8, 9, 10. ✓
- Continuous scroll, adjustable speed, rAF+transform, two-copy seamless loop, copy-2 hidden when loop off, repeat-period `contentHeight`, delta clamp/first-frame: Tasks 6, 7 (+ browser check Task 12). ✓
- Input via textarea + file + URL: Tasks 3, 4, 5, 8, 10. ✓
- UPC-A lenient validation; invalid flagged in setup and skipped in scroll: Tasks 2, 3, 7, 8. ✓
- Controls play/pause, speed, restart (resets + resumes), loop: Tasks 7, 9. ✓
- Finish summary "Finished scrolling {N} barcodes in {X} seconds", elapsed excludes pauses: Tasks 7, 9. ✓
- Types + `DEFAULT_SETTINGS` + merge: Tasks 1, 10. ✓
- package.json/tsconfig/index.html/vite.config (base + vitest jsdom)/canvas stub: Task 1. ✓
- Deployment (permissions, environment, concurrency, versions, Node 20, one-time Pages setting): Task 11. ✓
- Testing strategy (pure logic; jsdom caveats; browser smoke): Tasks 2–12. ✓

**2. Placeholder scan:** No `TBD`/`TODO`/"handle edge cases"/"similar to Task N"; every code step shows complete code and every run step shows the exact command + expected output. ✓

**3. Type consistency:** `UpcEntry`/`Settings`/`DEFAULT_SETTINGS` (Task 1) used identically downstream; `createScroller(container, entries, settings, onFinish?)` and the `Scroller` methods match between Tasks 7 and 9; `mountSetupView`/`mountPlayView`/`startApp` signatures match their consumers in Task 10; `advanceOffset`/`isAtEnd` signatures match between Tasks 6 and 7; `encodeShareUrl`/`decodeShareUrl` match between Tasks 5, 8, 10. ✓
