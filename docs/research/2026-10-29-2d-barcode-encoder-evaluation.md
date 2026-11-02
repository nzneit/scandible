# 2D barcode encoder evaluation: QR Code, Data Matrix, PDF417, Aztec

**Date:** 2026-10-29 (registry and GitHub data pulled 2026-10-30 UTC; hands-on measurements 2026-10-29/30)
**Status:** Research note. It informs a later design spec and is not itself a decision record.
**Method:** Two kinds of evidence:

- **Primary sources:** package repositories at pinned tags and commits, READMEs, type definitions,
  changelogs, release notes, licence files, npm registry metadata, the GitHub REST API, and the
  upstream projects (BWIPP, zxing-cpp, zint, rxing).
- **Hands-on probes:** a separate measurement run, cited as **[M1]** (local measurement, 2026-10-29/30,
  bun 1.3.14).

Each claim cites a source ID from the [Sources](#sources) list. **UNVERIFIED** marks anything that
could not be confirmed. A failed or skipped check counts as UNVERIFIED, never as a pass.

---

## Question

scandible is a static SvelteKit 2 + Svelte 5 SPA on GitHub Pages with no backend. It renders 21 linear
formats with JsBarcode 3.12.3 and draws the share-link QR code with uqr 0.1.3 [L2]. The task is to add
QR Code, Data Matrix, PDF417 and Aztec. A later spec will allow mixed formats in one list, so a single
engine for 1D and 2D is attractive.

1. Which browser-side encoder should render the four 2D symbologies?
2. Can that engine also replace JsBarcode for the 21 linear formats without losing the "show the exact
   scanned value" feature (`raw ✓ → encoded`) [L2]?

**Short answer:**

- **Use bwip-js for the four 2D symbologies now.** Import the four named encoders plus `drawingSVG`
  and pin the exact version. Keep JsBarcode for the linear formats for now.
- **bwip-js is the only candidate that passes every hard requirement.** It covers 4/4 of today's 2D
  symbologies, all 21 linear formats (18 directly, 3 only through a deprecated option) and all 7
  future symbologies. It is synchronous pure JavaScript with no wasm to host.
- **bwip-js gives module counts without loading the whole library.** A custom `DrawingContext.init()`
  wrapper returns them [M1].
- **The other candidates each fail something:**
  - **zxing-wasm** cannot write MSI.
  - **rxing-wasm** does not run from a browser bundle.
  - **@zxing/library** has no PDF417 writer.
  - **Both zint-wasm npm packages are unfit.**
  - **No single-symbology assembly** has a free, maintained Aztec SVG encoder [M1].
- **A single engine is feasible later, but only behind an app-side normalisation adapter.**
  - bwip-js exposes the human-readable text through a `text()` callback.
  - It rejects lowercase CODE39 and bare Codabar, which JsBarcode normalises today [M1].
  - zxing-wasm silently uppercases CODE39 instead of rejecting it [M1].

Details are in [Single-engine feasibility](#single-engine-feasibility) and
[Recommendation](#recommendation).

---

## Candidates considered

| #   | Candidate (version evaluated)                                                                          | What it is                                                                                                          | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **bwip-js 4.11.4** (BWIPP 2026-05-28), four named encoders + `drawingSVG`                              | JavaScript translation of BWIPP (Barcode Writer in Pure PostScript) [S1]                                            | **Recommended.** Tree-shaking works: 264,315 B min / 91,156 B gz, and `code128`/`ean13` are absent from the minimal bundle. The built bundle runs. No network calls [M1].                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2   | **zxing-wasm 3.1.6**, `zxing-wasm/writer`                                                              | Emscripten build of zxing-cpp, which creates symbols with an embedded libzint [S21][S30]                            | **Runner-up for 2D only.** Works and runs offline once `locateFile` points at the bundled wasm [M1]. Cannot write MSI: the wasm contains "Symbology zint_msi_plessey not implemented in embedded libzint", and `format:'MSI'` is rejected [M1]. It can therefore never replace JsBarcode for the MSI family.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 3   | bwip-js as the single 1D + 2D engine                                                                   | Same as #1, also replacing JsBarcode                                                                                | **Feasible later, with conditions** (see [Single-engine feasibility](#single-engine-feasibility))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 4   | rxing-wasm 0.5.8                                                                                       | wasm-bindgen build of rxing, a hand port of ZXing Java to Rust [S48][S50]                                           | **Rejected: it does not run from a browser bundle.** The entry does `import * as wasm from "./rxing_wasm_bg.wasm"`. `bun build --target=browser` turned that into a URL string, and the bundle failed at runtime with `TypeError j.__wbindgen_add_to_stack_pointer is not a function`. The `exports` map blocks the deep import needed to instantiate it manually [M1]. Vite 7 does not support wasm ESM integration without a plugin [S53]. A Vite + plugin build was not tried (**UNVERIFIED**). Even working, the wrapper returns no SVG, only an `"X "` text grid. It throws the bare string `"couldn't encode"`, and Data Matrix overflow is a wasm trap (`RuntimeError: Unreachable code…`). The wasm is 2,400,277 B (953,477 gz) [M1][S50][S51]. |
| 5   | @zxing/library 0.23.0                                                                                  | TypeScript port of ZXing Java [S54]                                                                                 | **Rejected: no PDF417 writer** [S55][M1]. `MultiFormatWriter` handles only QR. The barrel import does not tree-shake (463,181 B min) [M1]. The README says "Project in Maintenance Mode Only" [S54].                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 6a  | zint-based npm packages                                                                                | Direct zint wasm builds                                                                                             | **Both rejected:**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
|     | — `@rmhaiderali/zint-wasm` 0.1.0                                                                       | First published 2026-10-29 [S67]                                                                                    | **Option-leak bug:** zint writes the chosen version and ECC back, and they persist between calls. QR `"A"` after a 200-character QR comes out 53×53. Also, `encode().data` is bit-packed, not module values. The npm metadata has no licence field; the LICENSE file is BSD-3-Clause. bun did not emit its `new URL("zint.wasm", import.meta.url)` asset [M1][S67].                                                                                                                                                                                                                                                                                                                                                                                     |
|     | — `wasmzint` 1.0.1                                                                                     | zint 2.13, published 2023-12 [S67]                                                                                  | Stale. The wasm is embedded as base64 in the ESM entry: 1,799,916 B min / 725,887 B gz bundled, with crypto/elliptic polyfills pulled in. No type definitions. Zint warnings are treated as failures [M1].                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 6b  | Other multi-symbology packages: `@ashaffah/barcodes` 0.1.5, `@sythos/js_barcode_universal` 1.6.7       | New pure-TS encoders that cover all four 2D codes [S66][S68]                                                        | Rejected as too young. First published 2026-07-13 and 2026-08-06; each has 2 GitHub stars and one maintainer. GitHub reports Sythos's licence as `NOASSERTION` [S66][S68]. Not measured.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 6c  | Commercial: Barcode Bakery (`@barcode-bakery/*` 2.0.0), Syncfusion `@syncfusion/ej2-barcode-generator` | Vendor libraries [S64][S65]                                                                                         | Rejected on licence: CC-BY-ND-4.0 [S64] and "SEE LICENSE IN license" [S65]. Bakery Aztec draws to a canvas surface only [M1].                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 6d  | Assembly of single-symbology libraries                                                                 | QR: uqr; DM: datamatrix-svg-ts; PDF417: pdf417-generator or @makard/pdf417; Aztec: zxing-js `AztecWriter` or Bakery | **Rejected.** See [Assembly option](#assembly-of-single-symbology-libraries).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

npm searches used to look for other candidates: `zint`, `zint wasm`, `datamatrix generator`,
`data matrix encoder svg`, `pdf417 generator`, `aztec code generator`, `aztec encoder`,
`aztec barcode`, `aztec 2d barcode`, `azteccode`, `datamatrix`, `pdf417`, `2d barcode generator svg`,
`barcode generator wasm`, `keywords:aztec`, `keywords:datamatrix` and `keywords:aztec-code` [S69].

### Assembly of single-symbology libraries

| Symbology   | Best package found                                                                                        | Health (registry)                                        | Measured behaviour [M1]                                                                                                                                                        | Usable?                                          |
| ----------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| QR Code     | uqr 0.1.3 (already in use)                                                                                | 1 release in 24 months (2026-04-03), 0 open issues [S60] | Sync, bare `<svg viewBox>`, `encode().size`, throws `RangeError "Data too long"`. **Encodes an empty string without error.**                                                   | Yes                                              |
| Data Matrix | datamatrix-svg-ts 1.1.0                                                                                   | First published 2026-01-08, 0 stars, 1 contributor [S62] | Sync SVG string. `DataMatrixError` with a stable `.code`. Square by default. No GS1/FNC1.                                                                                      | Technically yes, but very young                  |
| PDF417      | pdf417-generator 1.1.1                                                                                    | HUB3 payment-slip focus [S63]                            | **Canvas only.** The source header says **LGPLv3** (a TCPDF port) although `package.json` says MIT. Non-ASCII crashes. CJS, no types.                                          | No                                               |
| PDF417      | @makard/pdf417 0.0.5 (2021)                                                                               | —                                                        | **Broken:** it calls undefined `bcdiv`/`bcmul` on numeric runs of 13 or more digits and on non-ASCII, and silently returns garbage on overflow. The source header says LGPLv3. | No                                               |
| Aztec       | zxing-js `AztecWriter` via deep import (Apache-2.0, 13,820 B gz) or Barcode Bakery (CC-BY-ND-4.0, canvas) | zxing-js is in maintenance mode [S54]                    | BitMatrix only (no SVG), or canvas only                                                                                                                                        | No free, maintained Aztec **SVG** encoder exists |

Measured assembly totals:

- A (uqr + datamatrix-svg-ts + @makard/pdf417 + zxing Aztec): 101,917 B min / 36,077 B gz, with a
  broken PDF417 part.
- B (uqr + datamatrix-svg-ts + pdf417-generator + Bakery Aztec): 82,824 B min / 31,345 B gz, with
  canvas-only PDF417 and Aztec [M1].

**Verdict:** an assembly is smaller, but not credible. It would bring four error models, an LGPL or
broken PDF417, and no free Aztec SVG.

---

## Comparison by criterion

### 1. Coverage of the four required symbologies

| Engine                       | QR       | Data Matrix                           | PDF417   | Aztec                 | Runs in a browser bundle?                           | Source    |
| ---------------------------- | -------- | ------------------------------------- | -------- | --------------------- | --------------------------------------------------- | --------- |
| bwip-js 4.11.4               | `qrcode` | `datamatrix`, `datamatrixrectangular` | `pdf417` | `azteccode`           | yes                                                 | [S6][M1]  |
| zxing-wasm 3.1.6             | `QRCode` | `DataMatrix`                          | `PDF417` | `AztecCode` / `Aztec` | yes, with a local `locateFile`                      | [S21][M1] |
| rxing-wasm 0.5.8             | yes      | yes                                   | yes      | yes                   | **no** (bun build fails at runtime)                 | [S49][M1] |
| @zxing/library 0.23.0        | yes      | yes (class)                           | **no**   | yes (class)           | yes, with deep imports                              | [S55][M1] |
| @rmhaiderali/zint-wasm 0.1.0 | yes      | yes                                   | yes      | yes                   | asset not emitted by bun; output wrong across calls | [M1]      |

### 2. Bundle size

**What the projects document:**

| Package              | Documented size                                                                                                                                               | Source                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| bwip-js              | No figures. The README says `toSVG()` "links to all BWIPP encoders, so it cannot be used with tree-shaking" and recommends named imports plus `drawingSVG()`. | [S1] L432-444                             |
| bwip-js (fixed cost) | The browser ESM loads the embedded OCR-A/OCR-B fonts at module top level, so they always ship                                                                 | [S4] L4277-4278                           |
| zxing-wasm           | Writer wasm "~636 KiB", reader "~1.04 MiB", full "~1.46 MiB". The CI budget allows ≤ 1 MB for the writer wasm and ≤ 100 kB for each JS file.                  | [S21] L141-163, `bundlewatch.config.json` |
| rxing-wasm           | Tarball: `rxing_wasm_bg.wasm` is 2,400,277 B (combined reader+writer)                                                                                         | [S51]                                     |

For the hands-on figures, see [Measured](#measured).

### 3. Sync vs async API

| Engine         | API shape                                                                                                                                                                                                              | Source                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| bwip-js        | **Synchronous.** `toSVG` "is synchronous"; `render()`/`raw()` are "synchronous and throws on error". Import takes 18 ms and the first QR 11 ms (bun).                                                                  | [S1] L398; [S3] L369, L434; [M1] |
| zxing-wasm     | **Async.** `writeBarcode` returns a Promise. The wasm loads lazily on the first call or through `prepareZXingModule`. JS import takes 3.6–4.0 ms, init from in-memory bytes 4.3–4.5 ms, and the first QR 2.7 ms (bun). | [S21] L240, L476; [M1]           |
| rxing-wasm     | Sync once the module is initialised, but it does not initialise from the bun browser bundle                                                                                                                            | [M1]                             |
| @zxing/library | Synchronous (returns a `BitMatrix`)                                                                                                                                                                                    | [S55][M1]                        |

scandible's `renderBarcodeSvg(entry, format): SVGElement` is synchronous [L2]. bwip-js needs no
change to that call path; zxing-wasm would make rendering async.

### 4. SVG output and symbol size in modules

| Engine         | SVG                                                                                                                                                                                 | Size in modules                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Source                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| bwip-js        | Bare `<svg viewBox="0 0 W H">`: no prolog and no width/height. The viewBox is in px; 1 pt maps to 1 px, and the default `scale` is **2** (`opts.scale \|\| 2`).                     | **Through a custom `DrawingContext`, without loading the whole library.** At runtime bwip-js calls `init(width, height, textScaleX, textScaleY)`; wrapping `drawingSVG().init` captures W and H. At `scale: 1`:<br>• QR, Data Matrix and Aztec: `cols = W/2`, `rows = H/2`, because BWIPP sets `/modunit 2`.<br>• PDF417: `cols = W`, `rows = H/3`, because `/modunit 1` and `rowmult` defaults to 3.<br>Checked: QR v1 is 42×42, so 21 modules; DM rectangle 26×12; Aztec 23×23; PDF417 137 × 10 rows. `padding` does not change `init()` dimensions. The default export's `raw()` also returns `pixx`/`pixy`, but costs 967,866 B min / 261,945 B gz. | [M1]; [S6] `DrawingContext.init`; [S9]; [S1] L119, L163 |
| zxing-wasm     | `WriteResult.svg` is zint's SVG: `<?xml…?>` + DOCTYPE + `<desc>Zint Generated Symbol</desc>`, width/height only, **no viewBox**. scandible would have to add a viewBox to scale it. | **Yes:** `symbol.width/height` in modules, **excluding the quiet zone** (QR `A` 21×21, DM `A` 10×10, PDF417 `A` 103×15, i.e. rows × 3, Aztec `A` 15×15). Every call also builds a PNG Blob, which cannot be switched off.                                                                                                                                                                                                                                                                                                                                                                                                                               | [M1]; [S23]; [S26] L38-46; [S34] L131-147               |
| rxing-wasm     | **No SVG**, only a text grid                                                                                                                                                        | Only by parsing the grid, which includes a margin; PDF417 rows are 4 lines high                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | [M1]; [S50]                                             |
| @zxing/library | No SVG, except the deprecated QR-only DOM `BrowserQRCodeSvgWriter`, which is not exported from the index                                                                            | `BitMatrix.getWidth/getHeight` (QR includes a 4-module margin by default)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | [M1]; [S55]                                             |

### 5. Error reporting (over-capacity, empty, invalid input)

All examples are measured [M1] unless another source is cited.

| Engine         | Mechanism                                                                                                                                                                                                                               | Over-capacity                                                                                                                                                                                                                          | Empty                                                                 | Other invalid input                                                                                                                                                                                                                                                                                         | Message stability                                                                                                                                                                                                                                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| bwip-js        | **Throws synchronously.** The README warns "`e` may be a string or Error object" [S1] L213; in [M1] it was always an `Error`.                                                                                                           | QR: `bwipp.qrcodeNoValidSymbol#27236: Maximum length exceeded or invalid content`<br>Aztec: `bwipp.azteccodeInputTooLong#30019: …`<br>DM: `bwipp.datamatrixTooMuchData#25674: …`<br>PDF417: `bwipp.pdf417inputTooLong#22902: …`        | `ReferenceError: bwip-js: bar code text not specified.` [S3] L377-381 | Bad option: `bwipp.qrcodeInvalidEClevel#27076`. A DM version that is too small: `bwipp.datamatrixNoValidSymbol#25890`. Impossible PDF417 `columns:1, rows:3` is **silently replaced** (1 × 40 rows, no error).                                                                                              | `#NNNNN` is a line number in the translated source, added by bwip-js: BWIPP itself raises plain `/bwipp.qrcodeNoValidSymbol` [S20] L949. It changes with each BWIPP sync. Match on the `bwipp.<errorName>` prefix. BWIPP has renamed error names before (HIBC, 2026-10) [S16] L36.                                                                 |
| zxing-wasm     | **Resolves with `{error}`; never rejects for encoding failures.** On error: `svg` is `""`, `image` is null and `symbol` is 0×0. It rejects only if the wasm fails to load: `Aborted(both async and sync fetching of the wasm failed)…`. | QR: `Error 567: Input too long, requires 5003 codewords (maximum 2956) (retval: 5)`<br>Aztec: `Error 502 … (retval: 5)`<br>DM: `Error 729 … (retval: 5)`<br>PDF417: `Error 463: Input length 3000 too long (maximum 2710) (retval: 5)` | `Can not create a barcode from NULL or empty data` [S31] L316         | Bad check digit: `Error 275: Invalid check digit '8', expecting '7' (retval: 7)`. Letters in EAN-13: `Error 284 … (retval: 6)`. `format:'MSI'`: `This is not a valid barcode format: 'MSI'`. `ecLevel=Z`: `Invalid ecLevel: 'Z'`. **Unknown options are silently ignored** (`nonsense=7`, QR `version=99`). | Classify by `(retval: N)` from zint's documented enum (5 too long, 6 invalid data, 7 invalid check, 8 invalid option) [S41] L342-357. **The `Error NNN` number is not stable across zint versions:** the same overflow is `Error 561` in older zint. Errors from the zxing-cpp layer carry no code. zint warnings are not reported [S31] L309-311. |
| rxing-wasm     | Throws the bare string `"couldn't encode"` (also for empty input). DM overflow causes a **wasm trap**.                                                                                                                                  | `"couldn't encode"` / `RuntimeError: Unreachable code should not be executed`                                                                                                                                                          | `"couldn't encode"`                                                   | Non-ASCII DM fails even with the UTF-8 hint                                                                                                                                                                                                                                                                 | No detail [S50]                                                                                                                                                                                                                                                                                                                                    |
| @zxing/library | Throws mixed types: `WriterException`, `IllegalArgumentException`, plain `Error`                                                                                                                                                        | QR: `Data too big`; Aztec: `Data too large for an Aztec code`; DM: plain `Error "Can't find a symbol arrangement…"`                                                                                                                    | QR: `Found empty contents`; Aztec: `No data bytes provided`           | —                                                                                                                                                                                                                                                                                                           | Mixed classes                                                                                                                                                                                                                                                                                                                                      |

### 6. TypeScript types, ESM, tree-shaking

| Engine               | Types                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | ESM                                                                                                        | Tree-shaking                                                                                                            | Source                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| bwip-js              | Bundled `.d.ts`, but they **resolve only under the `browser` or `node` export conditions**. The `exports["."]` map has only platform conditions. With `moduleResolution: bundler` and no `customConditions: ["browser"]`, tsc 7.0.2 reported `TS2307 Cannot find module 'bwip-js'`. **Symbology options are untyped:** `eclevel`, `format` and `columns` in an object literal give TS2769 (excess property); spreading them in from a variable compiles. The `raw` name is declared both as `ToRaw` overloads and as an encoder; at runtime the named `raw` is BWIPP's "raw" symbology, and `raw({bcid:'qrcode', text:'A'})` fails with `bwipp.rawBadCharacter#21949`. | Yes (`dist/bwip-js.mjs` via `exports` → `browser.import`)                                                  | **Works:** the minimal bundle excludes unused encoders, although there is no `sideEffects` field.                       | [M1]; [S7]; [S6] L127-145, dist L495-497 |
| zxing-wasm           | Bundled. `format` is a typed union (`'MSI'` gives TS2322). `options` is a free string. Depends on `@types/emscripten`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | ESM + CJS. The subpath `zxing-wasm/writer` and the wasm subpath `./writer/zxing_writer.wasm` are exported. | Writer-only wasm through the subpath                                                                                    | [M1]; [S28]                              |
| rxing-wasm           | Bundled, but hints are untyped strings                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Needs wasm ESM integration                                                                                 | —                                                                                                                       | [M1]; [S53]                              |
| @zxing/library       | Bundled. Hints are `Map<EncodeHintType, any>`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | ESM + CJS                                                                                                  | **The barrel does not tree-shake** (463,181 B vs 465,868 B for everything). Deep `esm/core/...` imports do (134,749 B). | [M1]                                     |
| JsBarcode (baseline) | Ships `jsbarcode.d.ts`; scandible adds a shim for the internal encoder classes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | CJS `main` only                                                                                            | n/a                                                                                                                     | [S57]; [L2]                              |

Whether SvelteKit's generated `tsconfig` (created by `svelte-kit sync`, not present in this checkout)
sets a `browser` custom condition is **UNVERIFIED**. svelte-check was not run against bwip-js.

### 7. Licences (package and what it wraps)

| Package                           | Package licence                                                     | Wraps / bundles                                                                     | Notes                                                                                                                                                                                                                                                          | Source                                     |
| --------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| bwip-js                           | MIT (© 2011-2026 Mark Warren)                                       | **BWIPP: MIT** (© 2004-2024 Terry Burton). The brief's "LGPL-3" guess is **wrong**. | Both MIT notices are in the shipped ESM header. The licence of the embedded OCR-A/OCR-B font data (`fonts/OCRA7.ttf`, `fonts/OCRB7.ttf`) is not stated in the repository (**UNVERIFIED**). GitHub reports `NOASSERTION` because of the extra licence files.    | [S2]; [S15]; [S4] L1-30; [S14]; [S13]      |
| zxing-wasm                        | MIT (JS)                                                            | `ZXingWasm.cpp`: Apache-2.0; zxing-cpp: Apache-2.0; **zint backend: BSD-3-Clause**  | zint's backend is BSD; its frontends and Qt backend are GPL. zxing-cpp compiles only `libzint` backend sources. BSD-3 clause 2 requires the copyright notice to be reproduced with binary redistributions, so plan an attribution page for the served `.wasm`. | [S21] L537-544; [S27]; [S39]; [S40]; [S35] |
| rxing-wasm                        | `"Apache 2.0"` (not a valid SPDX id)                                | rxing: Apache-2.0, port of ZXing                                                    |                                                                                                                                                                                                                                                                | [S51]; [S48] L7                            |
| @zxing/library                    | Apache-2.0                                                          | ZXing Java                                                                          |                                                                                                                                                                                                                                                                | [S56]                                      |
| @rmhaiderali/zint-wasm / wasmzint | No `package.json` field, BSD-3-Clause LICENSE / ISC                 | zint                                                                                |                                                                                                                                                                                                                                                                | [M1]; [S67]                                |
| pdf417-generator, @makard/pdf417  | `package.json` says MIT; **source headers say LGPLv3** (TCPDF port) | —                                                                                   | Licence conflict                                                                                                                                                                                                                                               | [M1]                                       |
| JsBarcode / uqr                   | MIT / MIT                                                           | uqr: modified from nayuki/QR-Code-generator                                         |                                                                                                                                                                                                                                                                | [S57]; [S60]                               |

### 8. Maintenance health

Data retrieved 2026-10-30 UTC from the npm registry and the GitHub REST API (`/releases`,
`/commits?since=2024-10-29`, and search counts). "12 mo" means issues created or closed since
2025-10-29.

| Project                 | Latest release                              | Releases, last 24 mo                                             | Open issues / PRs                          | Committers since 2024-10-29 (bus factor)  | Responsiveness evidence                                                                                                                                                                      | Source                       |
| ----------------------- | ------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **bwip-js**             | 4.11.4, 2026-08-19                          | 17 npm versions                                                  | 36 / 1                                     | metafloor 19, wojtekmaj 1 → **1**         | #385 reported 08-15, fixed 08-17; #386 reported and fixed 08-19; #373 reported and fixed 04-22. 18 issues opened / 13 closed (12 mo).                                                        | [S12][S13][S11]              |
| **BWIPP** (upstream)    | tag `2026-10-26`                            | **71** GitHub releases                                           | 1 / 0                                      | terryburton 1,145; gitlost 16; lyngklip 7 | 39 issues closed / 7 opened (12 mo)                                                                                                                                                          | [S19]                        |
| bwip-js ↔ BWIPP lag     | bwip-js 4.11.4 bundles BWIPP **2026-05-28** | —                                                                | —                                          | —                                         | Syncs come in batches: 2025-04-19, 2025-10-24, 2026-03-31, 2026-04-21, 2026-05-28                                                                                                            | [S1] L29; [S5] L47255; [S13] |
| **zxing-wasm**          | 3.1.6, 2026-10-19                           | 31 npm versions, including **2 majors** (2025-01-05, 2026-02-24) | 2 / 2 (Renovate)                           | Sec-ant 111 (+ bots), zzwubd 2 → **1**    | Writer issue #211 opened 2025-03-02, fixed in 2.1.1 (2025-05-01)                                                                                                                             | [S28][S29][S22] L293         |
| zxing-cpp (upstream)    | v3.1.1, 2026-07-29                          | 6 stable                                                         | 40 / 7                                     | axxel 660, gitlost 24, isning 16          | 73 issues closed / 65 opened (12 mo)                                                                                                                                                         | [S37][S39]                   |
| zint (upstream)         | 2.16.0, 2025-12-19                          | 3                                                                | Tracker is on SourceForge (**UNVERIFIED**) | gitlost 217, oehhar 7                     | —                                                                                                                                                                                            | [S47]                        |
| rxing / rxing-wasm      | v0.9.3 / 0.5.8 (2026-09)                    | 5 GitHub releases / 14 npm versions                              | 17 / 3 and 5 / 0                           | hschimke → **1**                          | rxing-wasm: 0 issues opened or closed (12 mo); GitHub tags stop at v0.3.2                                                                                                                    | [S52]                        |
| @zxing/library          | 0.23.0, 2026-04-29                          | 2                                                                | **172 / 11**                               | werthdavid 30, opl- 10                    | 1 closed / 6 opened (12 mo); "Maintenance Mode Only"                                                                                                                                         | [S56]; [S54] L8-17           |
| **JsBarcode** (current) | 3.12.3, 2026-01-07                          | 3                                                                | **118 / 17**                               | lindell 7, Alex Tessmer 5, xi 2 → **1**   | 3 issues closed / 3 opened, 1 PR merged (12 mo). The v4 PR #278 has been open since 2019. Unanswered PRs touch scandible's formats: #481 (MSI mod-11) and #482 (Pharmacode accepts `3junk`). | [S57][S58]                   |
| uqr (current)           | 0.1.3, 2026-04-03                           | 1                                                                | 0 / 0                                      | antfu 3                                   | —                                                                                                                                                                                            | [S60]                        |

**Observations:**

- Every wrapper has a bus factor of one.
- bwip-js responds fastest.
- zxing-wasm has had more API churn: two majors in 13 months, both changing the writer.
- JsBarcode is slow-moving but not abandoned. Its open PRs #481 and #482 bear on scandible's MSI11
  and Pharmacode formats. The PR claims, and whether scandible's input cleanup already avoids them,
  are **UNVERIFIED**.

### 9. Spec-conformance reputation

- **BWIPP** is an encoding oracle in zint's test harness ("run a test against BWIPP", `-d 128`). The
  same harness decodes against zxing-cpp (`-d 512`) [S45] L118-140.
- **bwip-js** says it behaves like BWIPP "for the vast majority of uses" [S10]. Its translator has
  introduced divergence: #385 (PDF417 of the letter `r` encoded wrongly) was traced to the
  translator's peephole optimiser and fixed in 4.11.3 [S11].
- **zint** has been zxing-cpp's default writing backend since 3.0 [S30] L7. The v3.0.0 release notes
  say the creator/writer API "moved out of experimental state" [S37]. zxing-wasm still marks its
  `WriteResult` `@experimental` [S23].
- **Shared people:** gitlost commits to BWIPP, zxing-cpp and zint [S19][S39][S47].
- **rxing** says: "Negative verification tests are not implemented" [S48] L11.
- **No encoder's output was round-tripped through a decoder in [M1]. Scannability is UNVERIFIED for
  every candidate.**
- **Sizing differs at QR eclevel H for a 38-character URL.** bwip-js and zint pick 33×33;
  @zxing/library and uqr pick 37×37 [M1]. These are different encoder optimisations; both may be
  valid.

### 10. Future symbologies

| Engine           | Micro QR      | rMQR                     | GS1 QR (FNC1)                          | GS1 DataMatrix (FNC1)          | DotCode   | Han Xin  | MaxiCode   | Source                                                                                       |
| ---------------- | ------------- | ------------------------ | -------------------------------------- | ------------------------------ | --------- | -------- | ---------- | -------------------------------------------------------------------------------------------- |
| bwip-js 4.11.4   | `microqrcode` | `rectangularmicroqrcode` | `gs1qrcode`, or `^FNC1` via `parsefnc` | `gs1datamatrix`                | `dotcode` | `hanxin` | `maxicode` | [S6]; [S17]; [M1] (for GS1, use the named GS1 encoders: `bcid` is ignored by named encoders) |
| zxing-wasm 3.1.6 | `MicroQRCode` | `RMQRCode`               | `options:'gs1'` (works)                | `options:'gs1'` (works)        | **no**    | **no**   | `MaxiCode` | [S21]; [S33]; [M1]                                                                           |
| rxing-wasm 0.5.8 | no            | no                       | `Gs1Format` hint accepted              | `Gs1Format` accepted (DM 32×8) | no        | no       | no         | [S48] L47-65; [M1]                                                                           |
| @zxing/library   | no            | no                       | no                                     | `GS1_FORMAT` accepted          | no        | no       | no         | [S55]; [M1]                                                                                  |

zxing-cpp's format table has no DotCode or Han Xin entries, and its bundled zint source list leaves
out `dotcode.c` and `hanxin.c` [S33][S35]. Whether any GS1 output is valid was not checked by a
decoder (**UNVERIFIED**) [M1].

---

## Measured

**Source: [M1] local measurement, 2026-10-29/30, bun 1.3.14** (JavaScriptCore, not a browser).

- Sizes come from `bun build --minify --target=browser`, then `wc -c` and `gzip -9c`.
- The re-measured sizes match the earlier main-session figures [L1]: minified bytes are identical and
  gzip differs by at most 6 B.

### Size

| Configuration                                                                                   | JS min (B)   | JS gz (B)    | wasm raw / gz (B)                  | Total gz (B)   |
| ----------------------------------------------------------------------------------------------- | ------------ | ------------ | ---------------------------------- | -------------- |
| **bwip-js 4.11.4**: `qrcode`, `datamatrix`, `pdf417`, `azteccode` + `drawingSVG`                | 264,315      | 91,156       | –                                  | **91,156**     |
| bwip-js, whole library (`export *`)                                                             | 972,910      | 263,008      | –                                  | 263,008        |
| bwip-js, minimal entry + default-export `raw`                                                   | 967,866      | 261,945      | –                                  | 261,945        |
| bwip-js, four 2D + the 15 linear encoders a single engine would need                            | not measured | not measured | –                                  | **UNVERIFIED** |
| **zxing-wasm 3.1.6** `writer`                                                                   | 27,220       | 10,720       | 667,014 / 353,849                  | **364,569**    |
| zxing-wasm writer, wasm emitted as a local asset (`--public-path=/scandible/`)                  | 27,305       | 10,717       | separate asset                     | —              |
| rxing-wasm 0.5.8 (**does not run** from this bundle)                                            | 7,985        | 2,554        | 2,400,277 / 953,477                | 956,031        |
| @zxing/library 0.23.0, barrel import (no PDF417)                                                | 463,181      | 120,546      | –                                  | 120,546        |
| @zxing/library 0.23.0, deep `esm/core/...` imports (no PDF417)                                  | 134,749      | 35,154       | –                                  | 35,154         |
| @rmhaiderali/zint-wasm 0.1.0                                                                    | 4,226        | 1,838        | 673,591 / 367,755                  | 369,593        |
| wasmzint 1.0.1, wasm inlined as base64 (bundled)                                                | 1,799,916    | 725,887      | (separate file: 892,645 / 437,503) | 725,887        |
| Assembly A: uqr + datamatrix-svg-ts + @makard/pdf417 (broken) + zxing Aztec                     | 101,917      | 36,077       | –                                  | 36,077         |
| Assembly B: uqr + datamatrix-svg-ts + pdf417-generator (canvas, LGPL) + Bakery Aztec (CC-BY-ND) | 82,824       | 31,345       | –                                  | 31,345         |
| uqr 0.1.3 (baseline)                                                                            | 10,812       | 4,235        | –                                  | 4,235          |
| JsBarcode 3.12.3 (baseline)                                                                     | 67,856       | 13,721       | –                                  | 13,721         |

### Throughput (bun/JSC; browser timings are UNVERIFIED)

| Engine                 | Init                                                 | 50 × QR (SVG)                            | 50 × PDF417 |
| ---------------------- | ---------------------------------------------------- | ---------------------------------------- | ----------- |
| bwip-js                | import 18 ms; first QR 11 ms                         | ~84 ms                                   | ~29 ms      |
| zxing-wasm             | import 3.6–4.0 ms + init 4.3–4.5 ms; first QR 2.7 ms | ~17 ms (also builds a PNG Blob per call) | ~24 ms      |
| rxing-wasm             | 8.2 ms                                               | ~41 ms (text grid only)                  | ~2.7 ms     |
| @zxing/library         | —                                                    | ~12 ms (BitMatrix only)                  | n/a         |
| @rmhaiderali/zint-wasm | 2.3 ms                                               | ~8.3 ms (shared instance, options reset) | ~14.3 ms    |
| uqr                    | —                                                    | ~21 ms                                   | n/a         |

### Defaults that affect layout [M1]

- **Data Matrix shape:**
  - bwip-js is **square by default** (20 characters give 18×18). `format:'rectangle'` gives 26×12.
  - zxing-wasm, rxing and @zxing/library choose a **rectangle when it is smaller** (26×12).
  - zxing-wasm's `options:'forceSquare'` gives 18×18. Its `version=N` is a zint size index, not a
    size.
- **QR error correction:** `eclevel` L/M/Q/H gives the same sizes in bwip-js, zxing-wasm and zint.
- **PDF417 `columns`/`rows`/`eclevel`:** bwip-js and zxing-wasm give the same sizes. Both silently
  replace an impossible `columns:1, rows:3` with 1 column × 40 rows.

---

## Single-engine feasibility

scandible shows `raw ✓ → encoded` whenever the encoder carries something other than the cleaned
value. Today it reads that value from JsBarcode's encoder-class `data` field [L2]. Replacing JsBarcode
requires (a) coverage of all 21 formats with compatible input handling, and (b) a way to learn the
normalised value.

### (a) Format coverage and input contracts

Sources:

- JsBarcode behaviour: its source at v3.12.3 [S59] and scandible's spec [L2].
- BWIPP behaviour: the BWIPP wiki [S17].
- zxing-wasm: the README and format table [S21][S33].

Rows marked [M1] were probed.

| scandible format | JsBarcode today                                                            | bwip-js / BWIPP                                                                                                                                                                                                         | zxing-wasm                                                                                                          |
| ---------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| code128          | auto                                                                       | `code128` ✓                                                                                                                                                                                                             | `Code128` ✓                                                                                                         |
| code128a / b / c | forced code set                                                            | ⚠ No option to force a code set, except the **deprecated** `raw` option (pre-encoded `^NNN` codewords) [S17 Code-128]                                                                                                   | ✗ No option [S32]                                                                                                   |
| ean13 / ean8     | appends the check digit                                                    | ✓ 12 / 7 digits → computed; 13 / 8 → verified [S17]. `'590123412345'` → HRT digits joining to `5901234123457` [M1].                                                                                                     | ✓ HRT `"5","901234","123457"` [M1]                                                                                  |
| ean5 / ean2      | —                                                                          | ✓                                                                                                                                                                                                                       | ✓ (write-only) [S21]                                                                                                |
| upc              | appends the check digit                                                    | `upca` ✓ [S17]                                                                                                                                                                                                          | ✓                                                                                                                   |
| upce             | accepts **6** digits (number system 0 assumed) or 8 [S59] `UPCE.js` L44-51 | ⚠ Accepts **7 or 8** digits (or 11/12 UPC-A digits) [S17 UPC-E]. The app must add a `0` prefix.                                                                                                                         | ✓ (input contract **UNVERIFIED**)                                                                                   |
| code39           | **uppercases** [S59]                                                       | ⚠ **Rejects lowercase:** `'hello'` → `bwipp.code39badCharacter#10257: Code 39 must contain only digits, capital letters…`. HRT for `'HELLO'` is `"*HELLO*"` [M1].                                                       | ⚠ **Silently uppercases:** `'hello'` → HRT `"*HELLO*"` [M1][S43] L147                                               |
| itf              | requires **even** length [S59]                                             | ⚠ Pads odd length with a leading `0` [S17]. The app must keep rejecting odd lengths.                                                                                                                                    | ✓                                                                                                                   |
| itf14            | check digit                                                                | ✓ 13 digits → computed [S17]. ⚠ Draws a bearer frame by default (`showborder`).                                                                                                                                         | ✓                                                                                                                   |
| msi family (5)   | checksums                                                                  | ✓ `msi` + `includecheck` + `checktype` (mod10/mod1010/mod11/mod1110). ⚠ A mod-11 value of 10 is refused unless `badmod11` is set [S17]. `'1234'` with mod10 → HRT `"1234"`; with `includecheckintext` → `"12344"` [M1]. | ✗ **Not writable:** `This is not a valid barcode format: 'MSI'`; the embedded libzint lacks `zint_msi_plessey` [M1] |
| pharmacode       | range 3–131070                                                             | ✓ [S17]                                                                                                                                                                                                                 | ✗ [S33]                                                                                                             |
| codabar          | **adds `A…A` guards**, uppercases [S59]                                    | ⚠ **Rejects bare data:** `'1234'` → `bwipp.rationalizedCodabarBadStartStop#15508`. `'A1234A'` → HRT `"A1234A"` [M1].                                                                                                    | ⚠ **Rejects bare data:** `Error 358: Does not begin with "A", "B", "C" or "D" (retval: 6)` [M1]                     |
| code93           | check characters always added                                              | ⚠ Added only with `includecheck` [S17 Code-93], so the adapter must always set it                                                                                                                                       | ✓                                                                                                                   |

**Tally:**

- bwip-js: 18/21 directly, plus code128a/b/c through a deprecated option.
- zxing-wasm: 12/21. MSI ×5, Pharmacode and code128a/b/c are missing.
- rxing-wasm and @zxing/library: not viable (they do not run, or lack formats).

**Only bwip-js can be a single engine.**

### (b) Exposing the normalised ("will scan as") value

| Engine         | Mechanism                                                                                                                                         | Works with the tree-shaken bundle? | Status                                                                                                                                                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| bwip-js        | A custom `DrawingContext` that wraps `drawingSVG()`, plus `includetext: true`. Capture the `text(x, y, str, …)` calls.                            | **Yes**                            | **Measured for EAN-13, CODE39, Codabar and MSI** [M1]. Human-readable text is not always the transmitted data: CODE39 includes the `*` start/stop characters, and MSI check digits appear only with `includecheckintext`. Each format needs a mapping rule. **UNVERIFIED** for the other 17 formats. |
| bwip-js        | Default-export `raw()` returns a `txt` array                                                                                                      | **No**: 261,945 B gz               | Works [M1][S3] L437-456                                                                                                                                                                                                                                                                              |
| BWIPP upstream | A caller-provided `uk.co.terryburton.bwipp.report` dictionary receives `checkdigit`, "the check characters that BWIPP added on the user's behalf" | n/a                                | **Added 2026-10-09 to 2026-10-26**, after the BWIPP copy in bwip-js 4.11.4. Absent from `dist/bwipp.mjs`. Whether bwip-js will expose it is **UNVERIFIED**. [S18] L175-220; [S16] L11, L158, L189, L202                                                                                              |
| zxing-wasm     | With `addHRT: true`, parse the SVG `<text>` elements. The `utf8` field is block art with no text.                                                 | Yes                                | **Measured for EAN-13, Code 39 and Codabar** [M1]. In C++, zxing-cpp holds zint's `content_segs` ("any check characters encoded will be included"), but `WriteResult` does not expose them. [S31] L323, L358-394; [S42] L2654-2670                                                                   |
| rxing-wasm     | Module grid only                                                                                                                                  | —                                  | Not possible [S50]                                                                                                                                                                                                                                                                                   |

### Verdict on a single engine

A single engine is **feasible only with bwip-js**, and only with an **app-side adapter per format**
behind scandible's `FormatDescriptor` `normalize` seam [L2]. Measurement confirmed that bwip-js
rejects inputs JsBarcode normalises today (lowercase CODE39, bare Codabar) [M1]. The engine therefore
cannot be swapped alone without regressing accepted input. The adapter would:

1. **Normalise in the app:**
   - uppercase CODE39;
   - add Codabar guards;
   - compute EAN/UPC/ITF-14/MSI check digits;
   - expand 6-digit UPC-E;
   - keep rejecting odd-length ITF.
2. **Pass the full value to BWIPP,** which verifies the supplied check digits [S17].
3. **Set the per-format options:**
   - `includecheck` for Code 93;
   - `includecheck` + `checktype` (+ `validatecheck`) for MSI.
4. **Make an explicit decision about code128a/b/c,** which needs the deprecated `raw` option.

The `raw ✓ → encoded` display would then come from scandible's own normaliser. That is
engine-independent and removes the dependency on JsBarcode's internal `data` field. The `text()`
capture can serve as a cross-check in tests. The cost is that scandible owns 21 normalisers, which
need parity tests against today's JsBarcode output.

zxing-wasm cannot be the single engine: MSI ×5, Pharmacode and code128a/b/c are unsupported, and it
silently uppercases where bwip-js rejects, so behaviour would differ by engine [M1].

---

## Risks

**bwip-js (recommended):**

- **Bus factor 1** [S13].
- **Point-release regressions:**
  - #372: 4.9.0 needed a critical fix.
  - #373: 4.10.0 broke on import.
  - #377: 4.10.x PDF417 infinite loop with `rowmult`.
  - #386: 4.11.3 emitted malformed `fill=rule="evenodd"`, which blanks QR, Aztec, Data Matrix and
    PDF417 in strict SVG parsers. Fixed in 4.11.4.

  [S11] **Mitigation:** pin the exact version, validate the SVG in tests, and add a decode
  round-trip test.

- **Translator divergence from BWIPP** (#385) [S11].
- **Upstream lag:** BWIPP 2026-05-28 against upstream 2026-10-26 [S1][S19].
- **Error-name `#line` suffix** changes with every sync [S5][S20][M1].
- **TypeScript friction:**
  - Types resolve only with the `browser`/`node` condition (`TS2307` otherwise).
  - Symbology options are untyped (TS2769 on literals).
  - The named `raw` export does not match its typing.

  Expect a local options type and possibly `customConditions: ["browser"]` [M1]. svelte-check
  behaviour is **UNVERIFIED**.

- **Silent option replacement** (impossible PDF417 `columns`/`rows`) [M1].
- **Non-ASCII text is UTF-8 encoded with no ECI unless requested** [M1][S5]. BWIPP's default reader
  interpretation is ISO 8859-1 [S17], and #376 (garbled Chinese QR) was closed unfixed [S11]. Decide
  ECI for the text formats.
- **Throughput:** in steady state, about 1.7 ms per QR versus 0.34 ms for zxing-wasm (bun) [M1].
  This is probably fine for scandible's list sizes, but browser timings are **UNVERIFIED**.
- **Fixed size cost:** the OCR fonts are always bundled [S4]. Their licence is **UNVERIFIED** [S14].

**zxing-wasm (runner-up):**

- **Bus factor 1** [S29].
- **Writer API churn:** `WriteResult` is `@experimental`, and v3.0.0 broke the writer options
  [S22][S23][S24].
- **Tracks unreleased zxing-cpp master** [S29].
- **Fetches from jsDelivr by default** unless `locateFile` is overridden. The override works with a
  bundled asset [M1], but under Vite/SvelteKit with the `/scandible/` base it is **UNVERIFIED**.
- **The SVG has no viewBox** [M1].
- **Async-only API** [S21].
- **A PNG Blob is built on every call** [M1].
- **Unknown options are silently ignored** [M1].
- **Data Matrix is rectangular when smaller unless `forceSquare` is set** [M1].
- **`Error NNN` numbers change across zint versions; use `retval`** [M1].

**Both:** whether the user's hardware scanners read each symbology, and whether any output decodes
correctly, is **UNVERIFIED** [M1].

**Staying on JsBarcode for 1D:** open correctness PRs #481 and #482 have had no maintainer response
[S58].

---

## Recommendation

1. **Adopt bwip-js for QR Code, Data Matrix, PDF417 and Aztec now.** Import `qrcode`, `datamatrix`,
   `pdf417` and `azteccode` with `drawingSVG` from `bwip-js` (browser ESM), pin an exact version,
   and wrap it behind the `FormatDescriptor` seam:
   - **Module counts:** get them from an `init()` wrapper on `drawingSVG()`. QR, DM and Aztec give
     W/2 × H/2; PDF417 gives W × H/3, at `scale: 1` [M1].
   - **Errors:** classify by the `bwipp.<errorName>` prefix (strip `#\d+`), and treat a
     `ReferenceError` as empty input [M1].
   - **Types:** define a local options type; symbology options are untyped [M1].
   - **Data Matrix:** decide square vs rectangle explicitly; BWIPP is square by default [M1].
2. **Keep JsBarcode for the 21 linear formats now**, and keep uqr for the share-link QR (4,235 B gz)
   [M1].
3. **Treat the single-engine move to bwip-js as a separate, later spec.** Gate it on an app-owned
   normaliser with parity tests against JsBarcode for all 21 formats, using `text()` capture as a
   cross-check. Alternatively, wait for bwip-js to expose BWIPP's `report.checkdigit`. Decide
   code128a/b/c explicitly.
4. **Add a decoder round-trip test** before relying on any encoder: none of [M1]'s outputs was
   decoded. zxing-wasm's _reader_ could serve as an independent test-only decoder.

**Top three deciding facts:**

1. **Coverage, measured:**
   - bwip-js renders all four 2D codes from a working tree-shaken bundle [M1]. It covers 21/21
     linear formats (18 directly) and 7/7 future symbologies [S6][S17].
   - zxing-wasm cannot write MSI [M1] and has no DotCode or Han Xin [S33].
   - rxing-wasm fails at runtime from a browser bundle [M1].
   - @zxing/library has no PDF417 writer [S55][M1].
   - Both zint-wasm packages are unfit [M1].
   - No free, maintained Aztec SVG encoder exists for an assembly [M1].
2. **Fit with a static, synchronous app:**
   - bwip-js is synchronous, makes no network calls, and costs 91,156 B gz in total, against
     364,569 B gz for zxing-wasm's writer JS plus wasm [M1].
   - It needs no wasm asset, CDN override or async rendering path.
   - Module counts are available without loading the whole library [M1].
3. **The "will scan as" feature needs an app-owned normaliser whichever engine is chosen:**
   - Neither engine exposes a normalised-data field in the tree-shaken API.
   - Both expose HRT text (bwip-js through `text()`, zxing-wasm through SVG `<text>`).
   - bwip-js rejects lowercase CODE39 and bare Codabar, while zxing-wasm silently uppercases CODE39
     [M1].
   - Keeping JsBarcode for 1D now costs nothing.

**What would change this recommendation:**

- Browser measurements show bwip-js throughput is a problem for long lists.
- zxing-wasm exposes `Barcode::text()` on `WriteResult`, adds a viewBox, and declares the writer
  API stable.
- bwip-js stops tracking BWIPP.

---

## Unverified items

**From the measurement run [M1]. Each is UNVERIFIED, or failed, and none counts as a pass:**

- **rxing-wasm in a browser bundle: failed.** The bun-built bundle throws at runtime. A Vite build with
  a wasm plugin was not tested.
- **@makard/pdf417 fails at runtime** on any numeric run of 13 or more digits, and on non-ASCII.
- **@zxing/library has no PDF417 writer.**
- **@rmhaiderali/zint-wasm** gives wrong output across calls (option leak) and returns bit-packed
  `encode()` data.
- **wasmzint's separate-wasm build** (`wasmzint.js`, not ESM) was not tested.
- **No output was round-tripped through a decoder.** Scannability, ECI insertion for non-ASCII, and
  GS1 validity are unverified for every candidate.
- **All timings are from bun/JSC.** Browser (V8/SpiderMonkey) wasm compile and encode times are
  unverified.
- **Vite/SvelteKit asset handling is unverified:** both zxing-wasm `?url` under `/scandible/` and
  zint-wasm's `new URL(…, import.meta.url)`. Only bun with `--public-path` was checked.
- **Type checks:** tsc 7.0.2 was run only for bwip-js and zxing-wasm; the other TypeScript statements
  come from reading the .d.ts files.
- **Barcode Bakery Aztec:** only `getDimension` was exercised, not rendering.
- **rxing PDF417 columns/rows:** no accepted `Pdf417Dimensions` value format was found, so this is
  unknown rather than proven absent.

**From source reading:**

- The licence of bwip-js's embedded OCR-A/OCR-B font data [S14].
- Whether and when bwip-js will expose BWIPP's `report` dictionary [S16][S18].
- `text()` capture for the 17 linear formats not probed (UPC-A/E, EAN-8/2/5, ITF, ITF-14, Code 93,
  Pharmacode, the code128 variants, MSI variants other than mod10).
- zxing-wasm UPC-E input contract.
- Whether SvelteKit's generated `tsconfig` resolves bwip-js types, and how svelte-check behaves.
- The bundle size of bwip-js with the 15 linear encoders added (not measured).
- zint's issue and PR health (SourceForge tracker).
- The claims in JsBarcode PRs #481 and #482, and whether scandible's cleanup avoids those inputs.
- Which hardware scanners read DMRE or rectangular Data Matrix.

---

## Sources

Retrieval: 2026-10-29/30 UTC. Repository files were read at the tag or commit shown.

**Local**

- [M1] Local measurement, 2026-10-29/30, bun 1.3.14: `docs/research/2026-10-29-2d-barcode-encoder-measurements.md`. The probe scripts and installs it describes lived in session scratch space and were not kept.
- [L1] Local measurement, 2026-10-29 (earlier main-session figures supplied with the task brief; confirmed by [M1]).
- [L2] scandible repository: `src/lib/barcode.ts` (synchronous `renderBarcodeSvg`), `src/lib/jsbarcode.d.ts` (encoder-class `data` shim), `docs/superpowers/specs/2026-07-21-barcode-formats-design.md` (encoded-value transparency, `normalize` seam), `tsconfig.json`, `package-lock.json` (vite 7.3.6).

**bwip-js 4.11.4 (tag `v4.11.4`, commit `4dcf6129ba4bcd7de760e7bd4e400bca11473ccf`)**

- [S1] README: https://github.com/metafloor/bwip-js/blob/v4.11.4/README.md
- [S2] LICENSE: https://github.com/metafloor/bwip-js/blob/v4.11.4/LICENSE
- [S3] `src/exports.js`: https://github.com/metafloor/bwip-js/blob/v4.11.4/src/exports.js
- [S4] `dist/bwip-js.mjs`: https://github.com/metafloor/bwip-js/blob/v4.11.4/dist/bwip-js.mjs
- [S5] `dist/bwipp.mjs` (`BWIPP_VERSION = '2026-05-28'`): https://github.com/metafloor/bwip-js/blob/v4.11.4/dist/bwipp.mjs
- [S6] Type definitions: https://github.com/metafloor/bwip-js/blob/v4.11.4/src/bwip-js.d.ts and https://github.com/metafloor/bwip-js/blob/v4.11.4/dist/bwip-js.d.ts
- [S7] `package.json` (exports map, no `sideEffects`): https://github.com/metafloor/bwip-js/blob/v4.11.4/package.json
- [S8] `src/drawing-svg.js`, `src/bwipjs.js`: https://github.com/metafloor/bwip-js/blob/v4.11.4/src/drawing-svg.js and https://github.com/metafloor/bwip-js/blob/v4.11.4/src/bwipjs.js
- [S9] Wiki, Notes on the Raw BWIPP Data (wiki rev `dbecc7b5`): https://github.com/metafloor/bwip-js/wiki/Notes-on-the-Raw-BWIPP-Data
- [S10] Wiki, Differences From BWIPP; Methods Reference; Annotated Example Drawing Object: https://github.com/metafloor/bwip-js/wiki/Differences-From-BWIPP, https://github.com/metafloor/bwip-js/wiki/Methods-Reference, https://github.com/metafloor/bwip-js/wiki/Annotated-Example-Drawing-Object
- [S11] Issues #385, #386, #384, #377, #376, #375, #373, #372: https://github.com/metafloor/bwip-js/issues/385 (and the others under the same path)
- [S12] npm registry: https://registry.npmjs.org/bwip-js
- [S13] GitHub API: https://api.github.com/repos/metafloor/bwip-js (`/releases`, `/commits?since=2024-10-29T00:00:00Z`, `/contents/dist?ref=v4.11.4`, search counts)
- [S14] Fonts and licence files: https://github.com/metafloor/bwip-js/tree/v4.11.4/fonts and https://github.com/metafloor/bwip-js/blob/v4.11.4/LICENSE.INCONSOLATA

**BWIPP (release tag `2026-10-26`, commit `11fa6d664e041521cc737c693cffdbdf5603caa3`; wiki rev `e67c6334`)**

- [S15] LICENSE (MIT): https://github.com/bwipp/postscriptbarcode/blob/2026-10-26/LICENSE
- [S16] CHANGES: https://github.com/bwipp/postscriptbarcode/blob/2026-10-26/CHANGES
- [S17] Wiki pages: https://github.com/bwipp/postscriptbarcode/wiki/Code-128, /Code-39, /Code-93, /Codabar, /EAN-13, /EAN-8, /EAN-2, /UPC-A, /UPC-E, /Interleaved-2-of-5, /ITF-14, /MSI-Plessey, /Pharmacode, /QR-Code, /Data-Matrix, /Check-Digits
- [S18] Wiki, Developing a Frontend to BWIPP: https://github.com/bwipp/postscriptbarcode/wiki/Developing-a-Frontend-to-BWIPP
- [S19] GitHub API: https://api.github.com/repos/bwipp/postscriptbarcode (`/releases`, `/commits`, `/contributors`)
- [S20] BWIPP QR source at the version in bwip-js: https://github.com/bwipp/postscriptbarcode/blob/2026-05-28/src/qrcode.ps.src

**zxing-wasm 3.1.6 (tag `v3.1.6`, commit `354547ec9c1c1816d666fe0a6e2695f75a4cdc89`)**

- [S21] README and `bundlewatch.config.json`: https://github.com/Sec-ant/zxing-wasm/blob/v3.1.6/README.md
- [S22] CHANGELOG: https://github.com/Sec-ant/zxing-wasm/blob/v3.1.6/CHANGELOG.md
- [S23] Bindings (`writeResult.ts`, `writerOptions.ts`, `barcodeSymbol.ts`, `barcodeFormat.ts`): https://github.com/Sec-ant/zxing-wasm/tree/v3.1.6/src/bindings
- [S24] Writer entry: https://github.com/Sec-ant/zxing-wasm/blob/v3.1.6/src/writer/index.ts
- [S25] Module loading: https://github.com/Sec-ant/zxing-wasm/blob/v3.1.6/src/share.ts
- [S26] C++ binding: https://github.com/Sec-ant/zxing-wasm/blob/v3.1.6/src/cpp/ZXingWasm.cpp
- [S27] Licences: https://github.com/Sec-ant/zxing-wasm/blob/v3.1.6/LICENSE and https://github.com/Sec-ant/zxing-wasm/blob/v3.1.6/src/cpp/LICENSE
- [S28] npm registry: https://registry.npmjs.org/zxing-wasm
- [S29] GitHub API https://api.github.com/repos/Sec-ant/zxing-wasm. Submodule pin: zxing-cpp `2c3dcfeffa7878950a58c1703c86774a428b0c91`, 90 commits ahead of v3.1.1 (https://github.com/zxing-cpp/zxing-cpp/compare/v3.1.1...2c3dcfeffa7878950a58c1703c86774a428b0c91)

**zxing-cpp (tag `v3.1.1`, commit `287c85df6f961c8efbfb5ffd736cd9457b8b890e`; plus the pin above)**

- [S30] README: https://github.com/zxing-cpp/zxing-cpp/blob/v3.1.1/README.md
- [S31] `CreateBarcode.cpp` at the pin: https://github.com/zxing-cpp/zxing-cpp/blob/2c3dcfeffa7878950a58c1703c86774a428b0c91/core/src/CreateBarcode.cpp
- [S32] `CreateBarcode.h`, `Barcode.h`: https://github.com/zxing-cpp/zxing-cpp/blob/v3.1.1/core/src/CreateBarcode.h and https://github.com/zxing-cpp/zxing-cpp/blob/v3.1.1/core/src/Barcode.h
- [S33] `BarcodeFormat.h`: https://github.com/zxing-cpp/zxing-cpp/blob/v3.1.1/core/src/BarcodeFormat.h
- [S34] `WriteBarcode.cpp`: https://github.com/zxing-cpp/zxing-cpp/blob/v3.1.1/core/src/WriteBarcode.cpp
- [S35] `core/CMakeLists.txt` and `core/src/libzint/`: https://github.com/zxing-cpp/zxing-cpp/blob/v3.1.1/core/CMakeLists.txt
- [S36] wasm wrapper README: https://github.com/zxing-cpp/zxing-cpp/blob/v3.1.1/wrappers/wasm/README.md
- [S37] Release notes: https://github.com/zxing-cpp/zxing-cpp/releases/tag/v2.3.0, /v3.0.0, /v3.1.0, /v3.1.1
- [S38] Writer-future discussion, closed 2026-02-10: https://github.com/zxing-cpp/zxing-cpp/issues/332
- [S39] LICENSE and GitHub API: https://github.com/zxing-cpp/zxing-cpp/blob/v3.1.1/LICENSE; https://api.github.com/repos/zxing-cpp/zxing-cpp

**zint 2.16.0 (commit `55541e139e62b9209b71cd9b0ba9010cec28b1d9`, the zxing-cpp submodule)**

- [S40] LICENSE and backend headers: https://github.com/zint/zint/blob/55541e139e62b9209b71cd9b0ba9010cec28b1d9/LICENSE
- [S41] `backend/zint.h`: https://github.com/zint/zint/blob/55541e139e62b9209b71cd9b0ba9010cec28b1d9/backend/zint.h
- [S42] Manual: https://github.com/zint/zint/blob/55541e139e62b9209b71cd9b0ba9010cec28b1d9/docs/manual.txt
- [S43] `backend/code.c`: https://github.com/zint/zint/blob/55541e139e62b9209b71cd9b0ba9010cec28b1d9/backend/code.c
- [S44] `backend/svg.c`: https://github.com/zint/zint/blob/55541e139e62b9209b71cd9b0ba9010cec28b1d9/backend/svg.c
- [S45] `backend/tests/README`: https://github.com/zint/zint/blob/55541e139e62b9209b71cd9b0ba9010cec28b1d9/backend/tests/README
- [S46] `backend/common.c`: https://github.com/zint/zint/blob/55541e139e62b9209b71cd9b0ba9010cec28b1d9/backend/common.c
- [S47] GitHub API: https://api.github.com/repos/zint/zint

**rxing / rxing-wasm**

- [S48] rxing README (tag `v0.9.3`): https://github.com/rxing-core/rxing/blob/v0.9.3/README.md
- [S49] rxing writers and BitMatrix: https://github.com/rxing-core/rxing/blob/v0.9.3/src/multi_format_writer.rs and https://github.com/rxing-core/rxing/blob/v0.9.3/src/common/bit_matrix.rs
- [S50] rxing-wasm `src/lib.rs` (commit `b6fc5dfd914809dceccf02468589fcc8d150c7f7`): https://github.com/rxing-core/rxing-wasm/blob/b6fc5dfd914809dceccf02468589fcc8d150c7f7/src/lib.rs
- [S51] rxing-wasm 0.5.8 tarball: https://registry.npmjs.org/rxing-wasm/-/rxing-wasm-0.5.8.tgz
- [S52] npm https://registry.npmjs.org/rxing-wasm; GitHub API https://api.github.com/repos/rxing-core/rxing and https://api.github.com/repos/rxing-core/rxing-wasm
- [S53] Vite 7.3 docs, WebAssembly: https://github.com/vitejs/vite/blob/v7.3.0/docs/guide/features.md#webassembly

**@zxing/library 0.23.0 (tag `v0.23.0`, commit `1722d0744fb5e8b47aebfbeb2b648e17c95e8595`)**

- [S54] README: https://github.com/zxing-js/library/blob/v0.23.0/README.md
- [S55] Writers (no PDF417 encoder): https://github.com/zxing-js/library/tree/v0.23.0/src/core
- [S56] npm https://registry.npmjs.org/@zxing/library; GitHub API https://api.github.com/repos/zxing-js/library

**JsBarcode 3.12.3**

- [S57] npm registry: https://registry.npmjs.org/jsbarcode
- [S58] GitHub API and PRs/issues: https://api.github.com/repos/lindell/JsBarcode; https://github.com/lindell/JsBarcode/pull/481, /pull/482, /pull/278, /issues/263
- [S59] Encoder sources: https://github.com/lindell/JsBarcode/blob/v3.12.3/src/barcodes/EAN_UPC/UPCE.js, https://github.com/lindell/JsBarcode/blob/v3.12.3/src/barcodes/ITF/ITF.js, https://github.com/lindell/JsBarcode/blob/v3.12.3/src/barcodes/CODE39/index.js, https://github.com/lindell/JsBarcode/blob/v3.12.3/src/barcodes/codabar/index.js

**Other packages**

- [S60] uqr: https://registry.npmjs.org/uqr; https://api.github.com/repos/unjs/uqr
- [S61] qrcode-generator, qrcode: https://registry.npmjs.org/qrcode-generator; https://registry.npmjs.org/qrcode
- [S62] datamatrix-svg-ts: https://registry.npmjs.org/datamatrix-svg-ts; https://api.github.com/repos/damischa1/datamatrix-svg-ts
- [S63] pdf417-generator: https://registry.npmjs.org/pdf417-generator; https://api.github.com/repos/pkoretic/pdf417-generator
- [S64] Barcode Bakery: https://registry.npmjs.org/@barcode-bakery/barcode-aztec
- [S65] Syncfusion: https://registry.npmjs.org/@syncfusion/ej2-barcode-generator
- [S66] @ashaffah/barcodes: https://registry.npmjs.org/@ashaffah/barcodes; https://api.github.com/repos/ashaffah/ts-barcodes
- [S67] zint wasm packages: https://registry.npmjs.org/@rmhaiderali/zint-wasm; https://api.github.com/repos/rmhaiderali/zint-wasm; https://registry.npmjs.org/wasmzint; https://registry.npmjs.org/@zshzebra/zint-wasm (404)
- [S68] @sythos/js_barcode_universal: https://registry.npmjs.org/@sythos/js_barcode_universal; https://api.github.com/repos/Sythos/JS_Barcode_Universal
- [S69] npm registry search API: https://registry.npmjs.org/-/v1/search?text=…
