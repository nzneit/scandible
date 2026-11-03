# GS1 encoders in bwip-js 4.11.4 — measurements

**Date:** 2026-11-03. **Method:** throwaway scripts run with `bun` against the installed
`node_modules/bwip-js/dist/bwip-js-node.mjs`, calling each named encoder with `drawingSVG()` whose
`init(W, H)` was wrapped to capture the symbol's pixel size without padding, at `scale: 1` and
`padding: 0` unless a row says otherwise. Nothing was decoded; scannability is unverified (see the
spec's _Verification that fails closed_). The scripts are not kept; every command line is
reproducible from the tables below.

Payloads used throughout:

- **S** `(01)09501101530003(17)261231(10)LOT42`
- **G** `(01)09501101530003`
- **E** `(01)09501101530003(3103)000123`

## 1. Sizes at scale 1 (pixels; `init` width × height, no padding)

| Encoder                  | Payload | Size      | Notes                                                                       |
| ------------------------ | ------- | --------- | --------------------------------------------------------------------------- |
| `gs1_128`                | S       | 255 × 37  | 1 px per module (23 symbol characters × 11 + 13 = 255). Default bar height. |
| `gs1_128` + `height: 18` | S       | 255 × 52  | `height` is in millimetres: h ≈ round(mm × 72 / 25.4) + 1.                  |
| `gs1_128` + `height: 18.3` | S     | 255 × 53  | 53 × 3 = 159 px at 3 px/module, within 1 px of JsBarcode's 160 px bars.     |
| `gs1_128` + `height: 19` | S       | 255 × 55  |                                                                             |
| `gs1_128` + `scale: 3`   | S       | 765 × 109 | `scale` multiplies both axes.                                               |
| `gs1_128` + `padding: 8` | S       | 255 × 37  | viewBox becomes `0 0 271 53`: padding is in px at scale 1, outside `init`.  |
| `databaromni`            | G       | 96 × 34   | 96 modules wide, 33X nominal height + 1.                                    |
| `databaromni` + `height: 2` | G    | 96 × 7    | BWIPP honours `height` for DataBar too and squashes the symbol. Never set it. |
| `databartruncated`       | G       | 96 × 14   |                                                                             |
| `databarstacked`         | G       | 50 × 13   | 5X + 1X separator + 7X rows.                                                |
| `databarstackedomni`     | G       | 50 × 69   | 33X + 3X separator + 33X.                                                   |
| `databarlimited`         | G       | 74 × 11   |                                                                             |
| `databarexpanded`        | E       | 200 × 35  | Width grows with the payload: 41 alphanumerics give 477 × 35.               |
| `databarexpandedstacked` | E       | 102 × 71  | Default 2 segments per row; `segments: 4` gives 102 × 108 for a longer E.   |
| `gs1datamatrix`          | S       | 36 × 36   | 2 px per module: 18 × 18 modules.                                           |
| `gs1qrcode`              | S       | 50 × 50   | 2 px per module: 25 × 25 (level M, the default). L: 42 (21×21). Q: 50. H: 58 (29×29). |
| `gs1dotcode`             | S       | 59 × 41   | 2 px pitch plus 1: `rows: 12` gives h 25, `columns: 30` gives w 61, `rows: 7` gives 157 × 15. So modules = (px − 1) / 2: 29 × 20 for S. |
| `gs1dotcode`             | G       | 43 × 29   | 21 × 14 modules.                                                            |
| `gs1northamericancoupon` | `(8110)106141416543213500110000310123196000` | 102 × 145 | Identical to `databarexpandedstacked` on the same payload. |

Human-readable text (`includetext: true`): `gs1_128` grows to 255 × 45 and the SVG from 1 337 to
28 189 characters (glyph outlines as paths); `databaromni` to 108 × 42 and 15 807 characters (the
text is wider than the bars, so `init` width changes); `databartruncated` 108 × 22; `databarlimited`
107 × 19. `databarstacked`, `databarstackedomni`, `databarexpanded` and `databarexpandedstacked`
ignore the option: identical size and SVG with or without it.

## 2. Validation (lint) behaviour

Every GS1 encoder runs BWIPP's AI linter before encoding. Error messages have the form
`bwipp.<name>#<line>: <text>`; the `#<line>` part changes between bwip-js versions, the name and
the text do not.

| Payload (encoder `gs1_128` unless noted)             | Strict result                                                              | With `dontlint: true`         |
| ---------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------- |
| `(01)09501101530004`                                 | `GS1badChecksum`: `AI 01: Bad checksum`                                    | renders, 134 × 37             |
| `(01)09501101530003(17)261345`                       | `GS1badMonth`: `AI 17: Invalid month`                                      | renders, 178 × 37             |
| `(01)095011015300031`                                | `GS1valueTooLong`: `AI 01: Too long`                                       | renders                       |
| `(01)0950`                                           | `GS1valueTooShort`: `AI 01: Too short`                                     | renders                       |
| `(01)`                                               | `GS1valueTooShort`: `AI 01: Too short`                                     | renders                       |
| `(01)0950110153000A`                                 | `GS1notNumeric`: `AI 01: Not numeric`                                      | renders                       |
| `(01)09501101530003(10)A B`                          | `GS1badCSET82character`: `AI 10: Invalid CSET 82 character`                | renders                       |
| `(01)09501101530003(10)Äb`, `…(10)A^B`, `…(10)A\(B\)C` | `GS1badCSET82character`                                                  | not probed                    |
| `(99999)123`, `(89)123`                              | `GS1unknownAI`: `AI 99999: Unrecognised AI`                                | renders                       |
| `(01)09501101530003(10)A(B)C`                        | `GS1unknownAI`: `AI B: Unrecognised AI` (a `(` always opens an AI)         | not probed                    |
| `(10)A(10)B`                                         | `GS1repeatedDifferingAIs`: `Repeated AIs (10) must have the same value`    | renders, 123 × 37             |
| `0109501101530003` (any GS1 encoder)                 | `GS1aiMissingOpenParen`: `AIs must start with '('`                         | **still fails**               |
| `(02)09501101530003`                                 | renders (mandatory pairings are not enforced by default)                   | renders                       |
| `(02)09501101530003` + `lintreqs: true`              | `GS1missingAIs`: `One of more requisite AIs for AI (02) are missing: 37`   | n/a                           |
| `databaromni` `(01)09501101530004`                   | `databaromniBadCheckDigit`: `Incorrect GS1 DataBar Omnidirectional check digit provided` | **still fails** |
| `databaromni` `(01)09501101530003(17)261231`         | `databaromniBadLength`: `GS1 DataBar Omnidirectional must be 13 or 14 digits` | **still fails**            |
| `databartruncated` / `databarstacked` / `databarstackedomni` `(01)09501101530004` | `databar<member>BadCheckDigit` with the member's name in the text | **still fails** |
| `databarlimited` `(01)09501101530004`                | `databarlimitedBadCheckDigit`                                              | **still fails**               |
| `databarlimited` `(01)29501101530003`, `(01)9501101530003` | `databarlimitedBadStartDigit`: `GS1 DataBar Limited must begin with 0 or 1` | **still fails**         |
| `databarexpanded` `(01)09501101530003(17)261345`     | `GS1badMonth`                                                              | renders, 200 × 35             |
| `databarexpandedstacked` `(01)09501101530004`        | `GS1badChecksum`                                                           | renders, 101 × 71             |
| `gs1datamatrix` / `gs1qrcode` / `gs1dotcode` `(01)09501101530004` | `GS1badChecksum`                                              | renders (32×32, 42×42, 43×29) |
| `gs1_128` `(01)09501101530003(10)abc`, `…(10)A,B`    | renders: lowercase and comma are in CSET 82                                |                               |
| `gs1_128` `(01)09501101530003(3103)000123(3922)1234` | renders (4-digit AIs)                                                      |                               |
| `gs1_128` `(10)LOT42(01)09501101530003`              | renders, 222 × 37 (a variable-length AI before a fixed one)                |                               |

So `dontlint` bypasses every `GS1*` lint error except the bracket-syntax ones, and never bypasses
the GTIN-only DataBar members' own checks (`databar<member>Bad*`).

The complete list of lint error names in this build (`grep -o 'bwipp\.GS1[A-Za-z0-9]*'`), 122
names, includes the general ones above plus 60 `GS1coupon*` names (AI (8110) structure), 7
`GS1dl*` names (Digital Link) and country/currency/package-type checks. Each GS1 encoder also owns
a few names: `gs1_128`: `gs1128badLinkage`, `gs1128inputTooLong`; `databaromni` and the other
GTIN-only members: `…BadAI`, `…BadCharacter`, `…BadCheckDigit`, `…BadFormat`, `…BadLength`
(+ `databarlimitedBadStartDigit`); `databarexpanded`: `databarexpandedBadFormat`,
`gs1databarexpandedBadSegments`, `gs1databarexpandedTooLong`; `gs1datamatrix`:
`gs1datamatrixinputTooLong`; `gs1qrcode`: `gs1qrcodeinputTooLong`; `gs1dotcode`:
`gs1dotcodeinputTooLong`.

## 3. Length limits

- `gs1128inputTooLong` fires when the bracketed input exceeds 500 characters;
  `gs1datamatrixinputTooLong` and `gs1qrcodeinputTooLong` at 4 000; `gs1dotcodeinputTooLong` at
  2 000. These are sanity caps on the input text, not symbol capacities.
- With lint on, per-AI length rules fire first: every attempt to overflow GS1 DataMatrix or GS1 QR
  Code with valid AIs failed on `GS1valueTooLong` (AI (90) to (99) allow 90 characters each; the
  sum of all AI maxima stays under the Data Matrix capacity). Symbol-capacity failures are
  therefore reachable only with `dontlint`, where the plain encoders' names surface
  (`qrcodeInputTooLong`, `datamatrixTooMuchData`, …, already in the app's too-long set).
- `gs1databarexpandedTooLong` (`Maximum length exceeded`) fires on real symbol capacity:
  `(01)09501101530003(10)` + 20 A + `(21)` + 20 B + `(240)` + 30 C fails; 41 alphanumerics render.
- BWIPP does **not** enforce GS1-128's 48-character ceiling: an 80-character element string
  renders at 893 × 37.

## 4. FNC1 placement

BWIPP's `aifixed` list (bwipp.mjs line 4125 in this build) is exactly
`00 01 02 03 04 11 12 13 14 15 16 17 18 19 20 31 32 33 34 35 36 41`: an AI whose first two digits
are in the list carries no FNC1 separator after its value. This is GS1 General Specifications
Figure 7.8.5-2, and the app's scan-data derivation uses the same literal list.

## 5. Coupon encoder (for spec 4)

`gs1northamericancoupon` accepts a single AI (8110) and nothing else: `(8110)…(8111)0100` and
`(8111)0100` alone both fail with `GS1missingAIs: … requisite AIs for AI (8111) are missing: 255`
(the encoder forces `lintreqs`), and its own messages are `A GS1 North American Coupon should
consist of a single AI (8110)`, `The AI (8110) data is too short` and `The AI (8110) data should
start with a Company Prefix length indicator in the range 0 to 6`. Options it reads:
`coupontext`, `includetext`, `dontlint`, `lintreqs`. Its output on a valid (8110) is identical to
`databarexpandedstacked`.
