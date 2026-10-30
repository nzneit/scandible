# Browser 2D barcode encoders: measurements and API probes (2026-10-29/30)

Hands-on measurement by an Opus subagent. All installs, entry files and probe scripts are in
/tmp/claude-1000/-home-nn-Projects-scandible/7fb85b10-dd44-45c6-b176-86296730d572/scratchpad/encoder-eval/,
one subdirectory per candidate. Every number comes from bun 1.3.14 (JavaScriptCore), not from a browser.
Sizes were measured with `bun build --minify --target=browser`, then `wc -c` and `gzip -9c`. Every entry
file exports the names it imports.

Re-measured sizes match the earlier main-session measurements (minified bytes identical; gzip differs by
at most 6 B).

## (1) Comparison table

| Candidate                                                             | Version                      | License                                                       | Min B                                    | Gz B                                 | wasm raw / gz                                               | Sync or async                  | SVG output                                                                                     | Module counts exposed                                                              | Errors                                                             | QR / DM / PDF417 / Aztec                    |
| --------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------- | ---------------------------------------- | ------------------------------------ | ----------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------- |
| bwip-js (4 named encoders + drawingSVG)                               | 4.11.4                       | MIT                                                           | 264,315                                  | 91,156                               | –                                                           | sync                           | bare `<svg viewBox>`, no prolog, no width/height                                               | no direct field; see bwip-js notes                                                 | throws `Error`                                                     | Y / Y / Y / Y                               |
| zxing-wasm/writer                                                     | 3.1.6                        | MIT                                                           | 27,220                                   | 10,720                               | 667,014 / 353,849                                           | async (Promise); init separate | `<?xml…?>` + DOCTYPE + `<desc>Zint Generated Symbol</desc>`, width/height only, **no viewBox** | yes: `symbol.width/height`, excludes the quiet zone                                | returns `{error:""}`; rejects only if the wasm fails to load       | Y / Y / Y / Y                               |
| rxing-wasm                                                            | 0.5.8                        | "Apache 2.0" (not a valid SPDX id)                            | 7,985                                    | 2,554                                | 2,400,277 / 953,477                                         | sync after module init         | **none**; returns a text grid of `"X "` / `"  "`                                               | only by parsing the text; it includes the margin, and PDF417 rows are 4 lines high | throws a bare string `"couldn't encode"`; wasm trap on DM overflow | Y / Y / Y / Y, but see the bundling failure |
| @zxing/library: barrel import                                         | 0.23.0                       | Apache-2.0                                                    | 463,181                                  | 120,546                              | –                                                           | sync                           | none; returns BitMatrix                                                                        | yes: `getWidth/getHeight` (QR includes a 4-module margin by default)               | throws typed exceptions                                            | Y / Y / **N** / Y                           |
| @zxing/library: deep `esm/core/...` imports                           | 0.23.0                       | Apache-2.0                                                    | 134,749                                  | 35,154                               | –                                                           | same                           | same                                                                                           | same                                                                               | same                                                               | same                                        |
| @rmhaiderali/zint-wasm                                                | 0.1.0 (published 2026-10-29) | no package.json field; LICENSE is BSD-3-Clause                | 4,226                                    | 1,838                                | 673,591 / 367,755                                           | init async, encode sync        | `<?xml…?>` + DOCTYPE, no viewBox                                                               | yes: `width`, `rows`                                                               | throws `Error("Error NNN: …")`                                     | Y / Y / Y / Y, but buggy                    |
| wasmzint (zint 2.13.0.9)                                              | 1.0.1 (2023-12)              | ISC                                                           | 1,799,916 bundled (1,304,599 as shipped) | 725,887 bundled (571,041 as shipped) | wasm embedded as base64; separate file is 892,645 / 437,503 | init async, encode sync        | Int8Array of SVG bytes with prolog                                                             | no; pixels only                                                                    | returns `{result:false, errorCode, error}`                         | Y / Y / Y / Y                               |
| uqr                                                                   | 0.1.3                        | MIT                                                           | 10,812                                   | 4,235                                | –                                                           | sync                           | bare `<svg viewBox>`                                                                           | yes: `size` (includes border, default 1)                                           | throws `RangeError`                                                | QR only                                     |
| datamatrix-svg-ts                                                     | 1.1.0                        | MIT                                                           | 9,042                                    | 4,344                                | –                                                           | sync                           | bare `<svg viewBox width height>`                                                              | yes: width/height                                                                  | throws `DataMatrixError` with `.code`                              | DM only                                     |
| pdf417-generator                                                      | 1.1.1                        | MIT field, but the source header says **LGPLv3** (TCPDF port) | 29,321                                   | 13,405                               | –                                                           | sync                           | **canvas only**                                                                                | canvas size only                                                                   | mixed: throws, or returns false                                    | PDF417 only                                 |
| @makard/pdf417                                                        | 0.0.5 (2021)                 | MIT field, source header LGPLv3                               | 31,537                                   | 14,201                               | –                                                           | sync                           | none; matrix                                                                                   | yes                                                                                | **broken** (see notes)                                             | PDF417 only                                 |
| zxing-js AztecWriter (deep import)                                    | 0.23.0                       | Apache-2.0                                                    | 50,345                                   | 13,820                               | –                                                           | sync                           | none; BitMatrix                                                                                | yes                                                                                | throws                                                             | Aztec only                                  |
| @barcode-bakery/barcode-aztec + common                                | 2.0.0 / 3.0.0                | **CC-BY-ND-4.0**                                              | 33,429                                   | 9,917                                | –                                                           | sync                           | canvas surface only                                                                            | `getDimension`                                                                     | throws                                                             | Aztec only                                  |
| Assembly A: uqr + datamatrix-svg-ts + @makard/pdf417 + zxing Aztec    |                              |                                                               | 101,917                                  | 36,077                               | –                                                           |                                |                                                                                                |                                                                                    |                                                                    | all 4 (but the PDF417 part is broken)       |
| Assembly B: uqr + datamatrix-svg-ts + pdf417-generator + Bakery Aztec |                              |                                                               | 82,824                                   | 31,345                               | –                                                           |                                |                                                                                                |                                                                                    |                                                                    | all 4 (PDF417 and Aztec are canvas only)    |

Other sizes measured:

- bwip-js `export *` (whole library): 972,910 min / 263,008 gz.
- bwip-js minimal entry plus the default export's `raw`: 967,866 min / 261,945 gz.
- zxing-wasm with the wasm bundled locally (built with `--public-path=/scandible/`): 27,305 min / 10,717 gz JS, plus the wasm as a separate asset.
- JsBarcode 3.12.3 cross-check: 67,856 min / 13,721 gz.

## (2) Per-candidate notes

### bwip-js 4.11.4 (BWIPP 2026-05-28)

Tree-shaking works. `code128` and `ean13` do not appear in the minimal bundle; the full bundle has 168 occurrences of `code128`. The built bundle runs and gives viewBox 42×42 for QR, 20×20 for DM, 103×18 for PDF417 and 38×38 for Aztec at scale 1.

Geometry:

- The default scale is **2**: bwip-js `FixupOptions` uses `opts.scale || 2`. So QR v1 is 84×84 by default and 42×42 at `scale:1`.
- The BWIPP source sets `/modunit 2 def` in the qrcode, datamatrix and azteccode encoders, and renmatrix uses `/width cols modunit mul 72 div`. That is 2 pt per module, and 1 pt is 1 px at scale 1.
- PDF417 sets `/modunit 1 def`, `/width rwid 72 div` and `/height r rowmult mul 72 div`, with `rowmult` defaulting to 3. At scale 1 that is 1 px per module across and 3 px per row. 'A' gives 103×18, which is 2 data columns and 6 rows.
- `padding` does not change the `init()` dimensions.

Getting module counts:

- **Trap:** the named ESM export `raw` is the BWIPP "raw" symbology encoder (`export function raw(opts,dwg){return _ToAny(bwipp_raw,...)}`). The real `ToRaw` is only on the default export. The .d.ts types the named `raw` as `ToRaw`, so the types do not match the runtime.
- Calling the named `raw({bcid:'qrcode',text:'A'})` fails. On the node build it rejects with `bwipp.rawBadCharacter#21949: Raw must contain only digits 1 to 9`.
- The default export's `bwipjs.raw({bcid,text})` does work and returns `{pixs,pixx,pixy,width,height}` (QR v1 gives pixx 21; PDF417 'A' gives pixx 103, pixy 18). But it pulls in the whole library (967,866 / 261,945).
- The reliable tree-shake-friendly way is a custom DrawingContext. At runtime `init` is called as `init(width, height, g_tsx, g_tsy)`, where the 3rd and 4th arguments are text scale factors, not "cavity". The custom ctx captured `[42,42,1,1]` for QR v1 at scale 1. Working call:
  ```ts
  let w = 0,
  	h = 0;
  const svg = drawingSVG();
  qrcode(
  	{ bcid: 'qrcode', text, scale: 1, padding: 0, includetext: false },
  	{
  		...svg,
  		init(W, H, ...r) {
  			w = W;
  			h = H;
  			return svg.init(W, H, ...r);
  		}
  	}
  );
  // QR/DM/Aztec: cols=w/2, rows=h/2.  PDF417: cols=w, rows=h/3 (h/rowmult)
  ```
  Checked results: QR 38-char URL at eclevel H gives 33×33; DM rectangle gives 26×12; Aztec 'héllo → 日本' gives 23×23; PDF417 test payload gives 137 wide and 10 rows.

Errors. All are thrown synchronously, never returned:

- QR, 5000 × 'x': `bwipp.qrcodeNoValidSymbol#27236: Maximum length exceeded or invalid content`
- Aztec, 5000: `bwipp.azteccodeInputTooLong#30019: The input data is too long`
- DM, 3000: `bwipp.datamatrixTooMuchData#25674: The input data exceeds the symbol capacity`
- PDF417, 3000: `bwipp.pdf417inputTooLong#22902: The input data is too long`
- Empty string, all four: `ReferenceError` `bwip-js: bar code text not specified.`
- Non-ASCII and newline succeed. Non-ASCII is UTF-8 encoded (`unescape(encodeURIComponent())`) with no ECI unless you ask for one.
- To classify errors, the stable part is the prefix `bwipp.<errorName>`. The `#NNNNN` is a BWIPP source line number and changes between versions. The bwip-js layer uses its own `bwip-js:` and `bwipjs:` prefixes.

Options:

- QR `eclevel` changes the size. 16 × 'x': L 21, M 25, Q 25, H 29. 38-char URL: L 29, M 29, Q 33, H 33. `eclevel:'X'` throws `bwipp.qrcodeInvalidEClevel#27076`.
- Data Matrix is **square by default** (20 chars give 18×18). `format:'rectangle'` gives 26×12, and `version:'18x18'` also works. A version that is too small throws `bwipp.datamatrixNoValidSymbol#25890`.
- PDF417 accepts `columns`, `rows`, `eclevel` (0–8), `rowmult` and `compact`:
  - columns 2 gives 2 columns × 20 rows; columns 6 gives 6 × 7; columns 3 with rows 20 gives 3 × 20.
  - eclevel 5 gives 6 × 16.
  - The impossible `columns:1,rows:3` was silently replaced: it returned 1 column × 40 rows with no error.
- For GS1/FNC1, use `parsefnc` with `^FNC1`, or the separate named encoders (`gs1datamatrix`, `gs1qrcode`, …). Passing `bcid:'gs1datamatrix'` to `datamatrix()` is ignored, and the text is encoded literally.

Performance: import 18 ms, first QR 11 ms. In steady state, 50 QR (SVG) take about 84 ms and 50 PDF417 about 29 ms.

Offline: no network calls. The `fetch(` matches in the bundle are internal cache methods.

TypeScript:

- Types are bundled but resolve only under the `browser` or `node` export conditions. With `moduleResolution: bundler` and no `customConditions:["browser"]`, tsc 7.0.2 reported `TS2307 Cannot find module 'bwip-js'`.
- Symbology options are **untyped**. `eclevel`, `format` and `columns` in an object literal give an excess-property error (TS2769). Spreading them in from a variable compiles.

### zxing-wasm 3.1.6 (writer subpath)

The writer wasm embeds **libzint**. It contains strings such as "Symbology zint_msi_plessey not implemented in embedded libzint". MSI, Code 11, Plessey and others cannot be written.

Calls and output:

- `writeBarcode()` returns a Promise of `{svg, utf8, image: Blob (PNG), error, symbol}`.
- `symbol.width/height` are in modules and exclude the quiet zone: QR 'A' 21×21, DM 'A' 10×10, PDF417 'A' 103×15 (rows × 3), Aztec 'A' 15×15 compact.
- SVG at scale 1 with default quiet zones is QR 29×29, DM 12×12 and PDF417 107×19. With `addQuietZones:false` the SVG equals the symbol size; `scale` multiplies it.
- `utf8` is block-character art, not text.

Errors. `writeBarcode` resolves with `error` set; it does not reject. `symbol` is 0×0, `svg` is "" and `image` is null:

- QR, 5000: `Error 567: Input too long, requires 5003 codewords (maximum 2956) (retval: 5)`
- Aztec, 5000: `Error 502: Input too long, requires too many codewords (maximum 1661) (retval: 5)`
- DM, 3000: `Error 729: Input too long, requires too many codewords (maximum 1558) (retval: 5)`
- PDF417, 3000: `Error 463: Input length 3000 too long (maximum 2710) (retval: 5)`
- Empty string, all four: `Can not create a barcode from NULL or empty data`
- `format:'Bogus'` or `'MSI'`: `This is not a valid barcode format: 'MSI'`
- `ecLevel=Z`: `Invalid ecLevel: 'Z'`
- EAN-13 with a bad check digit: `Error 275: Invalid check digit '8', expecting '7' (retval: 7)`
- EAN-13 letters: `Error 284: … (retval: 6)`
- To classify zint errors, use `(retval: N)` with zint codes (5 too long, 6 invalid data, 7 invalid check). The `Error NNN` number depends on the zint version; the same overflow is `Error 561` in wasmzint's older zint. Errors from the zxing-cpp layer carry no code.
- Unknown options are silently ignored (`nonsense=7,foo`, and `version=99` for QR).
- Non-ASCII succeeds: QR is 25×25. That size equals zint's UNICODE_MODE with ECI 26, which suggests an ECI is inserted (inference, not decoded). Newline succeeds.
- The one rejection seen: if the wasm cannot be fetched, the call rejects with `Aborted(both async and sync fetching of the wasm failed)…`.

Options:

- `options:'ecLevel=L|M|Q|H'` (or the deprecated `ecLevel` property) gives the same sizes as bwip-js.
- **Data Matrix defaults to rectangular when a rectangle is smaller** (20 chars give 26×12). Force square with `options:'forceSquare'` (18×18); the deprecated `forceSquareDataMatrix:true` also works. `version=N` is a zint size index (18 gives 80×80), not a size.
- PDF417 `options:'columns=…,rows=…,ecLevel=…'` produces exactly the same sizes as bwip-js. The impossible columns 1, rows 3 gives 1 column × 40 rows.
- GS1 with `options:'gs1'` and `(01)…` input works for QR, DM, Aztec, PDF417 and Code128. A bad AI gives `Error 255: Invalid AI at position 1 in input (AI too long) (retval: 6)`.

Performance: JS import 3.6–4.0 ms; `prepareZXingModule` from in-memory bytes 4.3–4.5 ms; first QR 2.7 ms. In steady state, 50 QR take about 17 ms and 50 PDF417 about 24 ms. Each call also builds a PNG Blob, which cannot be switched off.

Offline:

- By default it fetches `https://fastly.jsdelivr.net/npm/zxing-wasm@3.1.6/dist/writer/zxing_writer.wasm`; caught with a trapped fetch.
- A working local setup:
  ```ts
  import wasmUrl from 'zxing-wasm/writer/zxing_writer.wasm' (file/?url);
  prepareZXingModule({overrides:{locateFile:(p,pre)=>p.endsWith('.wasm')?wasmUrl:pre+p}})
  ```
  The package exports the subpath `./writer/zxing_writer.wasm`.
- With bun `--public-path=/scandible/`, this emitted `zxing_writer-n6w1dy78.wasm` and the URL `/scandible/zxing_writer-n6w1dy78.wasm`. A mocked fetch confirmed the only request was the subpath URL. The jsDelivr string stays in the bundle as the unused default.

TypeScript: types are bundled. `format` is a typed union: 'MSI' gives TS2322, while 'Aztec' and 'AztecCode' are accepted. `options` is a free string. The types depend on `@types/emscripten`, which is a dependency.

### rxing-wasm 0.5.8

- `encode_barcode(data, w, h, BarcodeFormat.X)` and `encode_barcode_with_hints(...)` are sync. They return the BitMatrix as text, `"X "` or two spaces per module, rows separated by newlines. There is **no SVG**.
- QR 'A' gives 29×29 including a 4-module margin; `Margin:'0'` gives 21. DM 10×10 and Aztec 15×15 have no margin. PDF417 is scaled: the default for the test payload is 214×92 with a 30-module margin, and 154×32 at margin 0 (rows are 4 lines high).
- **Bundling failure:** the browser entry does `import * as wasm from "./rxing_wasm_bg.wasm"`, which needs WASM ESM integration. `bun build --target=browser` turned it into a URL string, and the built bundle fails at runtime with `TypeError j.__wbindgen_add_to_stack_pointer is not a function`. The `exports` map blocks a deep import of `rxing_wasm_bg.js`, so you cannot instantiate it manually either.
- Errors:
  - Over-capacity QR, Aztec and PDF417 throw the bare string `"couldn't encode"`. So do empty input and MaxiCode.
  - DM with 3000 chars throws `RuntimeError: Unreachable code should not be executed` (a Rust panic). Later calls still worked in JSC.
  - Non-ASCII fails with "couldn't encode" for DM, PDF417 and Aztec. With the `CharacterSet:'UTF-8'` hint, PDF417 and Aztec succeed but DM still fails. Latin-1 "héllo" in DM works.
- Hints are strings, and `set_hint` returns false for values it cannot parse:
  - `ErrorCorrection` sizes with a 4-module margin: 16 × 'x' gives L 29, M 33, Q 33, H 37; the 38-char URL gives L 37, M 37, Q 41, H 45. Minus 8 that is the same as bwip-js except H = 37.
  - `DataMatrixShape` accepts only `ForceNone`, `ForceSquare` and `ForceRectangle`; the default is 26×12 and ForceSquare gives 18×18.
  - `Pdf417Dimensions` rejected all six formats tried, so PDF417 columns or rows could not be controlled.
  - `Gs1Format:'true'` is accepted (DM gives 32×8).
- Performance: import plus instantiate 8.2 ms. 50 QR take about 41 ms and 50 PDF417 about 2.7 ms, text output only.
- Types are bundled; hints are untyped strings.

### @zxing/library 0.23.0

- Writers present: `QRCodeWriter`, `DataMatrixWriter` and `AztecCodeWriter` (the AztecWriter file). **There is no PDF417Writer.** MultiFormatWriter supports only QR_CODE; the other cases are commented out.
- `BrowserQRCodeSvgWriter` is deprecated, QR only, returns a DOM `SVGSVGElement`, and is not exported from index.
- The barrel import does not tree-shake: 463,181 bytes, against 465,868 for the whole library. There is no `sideEffects` field. Deep imports work (`@zxing/library/esm/core/qrcode/QRCodeWriter` etc.), and the built bundle runs.
- Errors:
  - QR, 5000: `WriterException "Data too big"`
  - Aztec, 5000: `IllegalArgumentException "Data too large for an Aztec code"`
  - DM, 3000: plain `Error "Can't find a symbol arrangement that matches the message. Data codewords: 1559"`
  - Empty input: QR `IllegalArgumentException "Found empty contents"`, DM `Error "Found empty contents"`, Aztec `"No data bytes provided"`
  - Non-ASCII and newline succeed.
- Options:
  - `ERROR_CORRECTION` at margin 0: 16 × 'x' gives L 21, M 25, Q 25, H 29; the 38-char URL gives L 29, M 29, Q 33, **H 37** (bwip-js and zint give 33).
  - `DATA_MATRIX_SHAPE`: the default is 26×12; 1 (FORCE_SQUARE) gives 18×18.
  - `GS1_FORMAT` is accepted.
- Hints are `Map<EncodeHintType, any>`, so values are untyped. 50 QR take about 12 ms, BitMatrix only.

### @rmhaiderali/zint-wasm 0.1.0 (published 2026-10-29)

- `Zint.init(bytes|url)` is async. With no argument it loads `new URL("zint.wasm", import.meta.url)`, a local relative URL with no CDN. bun build did **not** emit the wasm for that pattern.
- `svg()` and `encode()` are sync and return `{svg, width, rows}` in modules. At scale 1 the SVG is 2 px per module (QR 'A' gives 42×42; PDF417 206×30 is 103 modules × 5 rows).
- **Bug 1:** options leak between calls on the same instance. Zint writes the chosen version and ECC back, and `clearSymbol` does not reset them. QR "A" after a 200-char QR came out 53×53, and DM "A" after a larger DM came out 26×26. Passing `option1:-1, option2:0` (and option3) on every call, or a new instance per call, avoids it.
- **Bug 2:** `encode().data` is bit-packed bytes, not module values. Row 0 of QR 'A' read `127,204,31,0,…`.
- Errors are thrown as `Error`:
  - QR, 5000: `Error 567: Input too long, requires 5003 codewords (maximum 2956)`
  - Aztec, 5000: `Error 502: Input too long, requires too many codewords (maximum 1661)`
  - DM, 3000: `Error 729: Input too long, requires too many codewords (maximum 1558)`
  - PDF417, 3000: `Error 463: Input length 3000 too long (maximum 2710)`
  - Empty input comes from the wrapper: `RangeError "Offset should not be negative"`.
  - Warnings (return codes 1–4) are dropped silently.
- Options:
  - QR `option1` 1–4 gives the same sizes as bwip-js.
  - DM `option3:100` forces square; the default is rectangular-if-smaller.
  - PDF417 `option2` sets columns, `option3` rows and `option1` the ECC, with the same sizes as zxing-wasm.
  - GS1 is `inputMode:2` with `[AI]` brackets; a bad AI gives `Error 255`. Note that `inputMode:1` is UNICODE_MODE.
- Performance: init from bytes 2.3 ms. With a shared instance and options reset, 50 QR take about 8.3 ms and 50 PDF417 about 14.3 ms. A new instance per call costs 133 ms for 50 QR.
- Types are bundled; the options are plain numbers with zint meanings.

### wasmzint 1.0.1 (zint 2.13.0.9)

- The ESM entry `index.js` contains the wasm as base64. bun's browser bundle also pulled in crypto-browserify and elliptic polyfills because of the emscripten `require('crypto'|'fs'|'path')` code.
- `new M.ZintWrapper().encodeAndPrint({symbology, outfile:'x.svg', …}, data)` returns `{file: Int8Array (SVG with prolog), result}`. `encodeAndVector` and `encodeAndBuffer` give pixel geometry only, with no module counts. Zint parameter names are snake_case (`option_1`, `input_mode`, `show_hrt`, …).
- Errors are returned, not thrown:
  - QR, 5000: `{result:false, errorCode:5, error:"Error 561: Input too long for selected error correction level"}`
  - Empty input: errorCode 6, `Error 778: No input data (segment 0 empty)`
- Warnings are treated as failure. `input_mode:1` with non-ASCII returns `errorCode:3 "Warning 222: Encoded data includes ECI 26"` and no file.
- No option leak was seen. Performance: init 9.6 ms; 50 QR about 13 ms; 50 PDF417 about 11.6 ms. No type definitions.

### Single-symbology packages

- **uqr:** `renderSVG` gives a bare `<svg viewBox>`, sync; `encode` returns `{size, version, data, …}`. 5000 × 'x' throws `RangeError "Data too long"`. Empty string encodes without error. Non-ASCII and newline succeed. `ecc` is typed `'L'|'M'|'Q'|'H'`. Sizes: L 21, M 25, Q 25, H 29 for 16 × 'x'; H is 37 for the 38-char URL. 50 `renderSVG` calls take about 21 ms.
- **datamatrix-svg-ts:** Sync; `toSvgString` gives a bare `<svg viewBox width=256 height=256>` with no DOM needed; `encodeToMatrix` gives `{matrix, width, height}`. Errors are `DataMatrixError` with a stable `.code` (`MESSAGE_TOO_LONG`, `EMPTY_MESSAGE`, `UNSUPPORTED_CHARACTER`). Non-ASCII with the default UTF-8 works (20×20). **Square by default** (18×18); `rectangular:true` gives 26×12. Optional `eci`. No GS1/FNC1.
- **pdf417-generator:** Draws to a canvas only. `draw(code, canvas, aspectratio, ecl, dpr, color)` has no matrix return value. With a fake canvas: 3000 chars throws `Error "Input too large for PDF417: encoded to 1501 codewords, maximum is 925."`. Empty returns `false`. Non-ASCII crashes with a `TypeError` (undefined cluster). Only aspect ratio and ECC can be set, no explicit columns or rows. CommonJS, no types.
- **@makard/pdf417: broken.** Numeric compaction calls the undefined globals `bcdiv`/`bcmul`. "1234567890123" throws `ReferenceError: bcdiv is not defined`, and non-ASCII throws `bcmul is not defined`. 3000 chars and empty input return garbage (`num_cols` undefined) with no error. Its `main` is a `.ts` source file.
- **Aztec:** no maintained standalone free Aztec package was found. The options are the zxing-js `AztecWriter` (deep import, BitMatrix) or Barcode Bakery, which is CC-BY-ND-4.0 and draws to a canvas surface. Bakery `getDimension` gave 15×15 for 'A'; 5000 chars throws "Too many bits to encode."; empty throws "Provide data to parse."; non-ASCII gives 19×19.

## Normalised data for linear codes (single-engine question)

**bwip-js.** Read the text with a custom `text(x,y,str,…)` callback plus `includetext:true`. The default-export `bwipjs.raw()` also returns a `txt` array, but it pulls in the whole library.

- EAN-13 '590123412345' → 13 separate strings: `"5","9","0","1","2","3","4","1","2","3","4","5","7"`, which join to 5901234123457.
- CODE39 'hello' → throws `bwipp.code39badCharacter#10257: Code 39 must contain only digits, capital letters, spaces and the symbols -.$/+%`. 'HELLO' → `"*HELLO*"` (the start/stop asterisks are included). code39ext 'hello' → `"*h e l l o *"`.
- Codabar (rationalizedCodabar) '1234' → throws `bwipp.rationalizedCodabarBadStartStop#15508`. 'A1234A' → `"A1234A"`.
- MSI '1234' with `includecheck` and `checktype:'mod10'` → `"1234"`; adding `includecheckintext:true` → `"12344"`.

**zxing-wasm.** Read the `<text>` elements of the SVG with `addHRT:true`. The `utf8` field is block art and carries no text.

- EAN13 '590123412345' → `"5","901234","123457"` (13 digits).
- Code39 'hello' → silently uppercased, HRT `"*HELLO*"`. Code39Ext 'hello' → `"hello"`.
- Codabar '1234' → error `Error 358: Does not begin with "A", "B", "C" or "D" (retval: 6)`. 'A1234A' → `"A1234A"`.
- MSI → `This is not a valid barcode format: 'MSI'`, because MSI is not writable.

**zint-wasm** (same zint engine, for reference): Code39 'hello' with option2:1 → `"*HELLOB*"`; MSI_PLESSEY '1234' with option2:1 → `"12344"`.

## (3) Failures and unverified items

These are not counted as passes:

- **rxing-wasm in a browser bundle: failed.** The bun-built bundle throws at runtime. A Vite build with a wasm plugin was not tested.
- **@makard/pdf417 fails at runtime** on any numeric run of 13 or more digits, and on non-ASCII.
- **@zxing/library has no PDF417 writer.**
- **@rmhaiderali/zint-wasm** gives wrong output across calls (option leak) and returns bit-packed `encode()` data.
- **wasmzint's separate-wasm build** (`wasmzint.js`, not ESM) was not tested.
- **No output was round-tripped through a decoder.** Scannability, ECI insertion for non-ASCII, and whether GS1 output is valid are unverified for every candidate.
- **All timings are bun/JSC.** Browser (V8/SpiderMonkey) wasm compile and encode times are unverified.
- **Vite/SvelteKit asset handling is unverified:** both zxing-wasm `?url` under `/scandible/` and zint-wasm's `new URL(…, import.meta.url)`. Only the bun build with `--public-path` was checked.
- **Type checks:** tsc 7.0.2 was run only for bwip-js and zxing-wasm. The other TypeScript statements come from reading the .d.ts files.
- **Barcode Bakery Aztec:** only `getDimension` was exercised, not rendering.
- **rxing PDF417 columns/rows:** no accepted `Pdf417Dimensions` value format was found, so this is unknown rather than proven absent.
