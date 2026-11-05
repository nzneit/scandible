# scandible

scandible turns a list of codes into crisp, high-contrast barcodes and plays them on screen, one
after another, so a hardware scanner can read the whole list hands-free. It runs in the browser,
so there is nothing to install.

**▶ [Open scandible](https://nzneit.github.io/scandible/)** · [Full guide](docs/guide.md)

## What you can test

| You want to…                                     | Use                                                                                                                | Details                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Run a long list through a scanner hands-free     | Paste the list and press **Start**. With **Loop** off, a summary says how many codes played and how long it took.  | [Playback](docs/guide.md#playback)                                            |
| Find the fastest rate a scanner keeps up with    | **Step** mode: lower the dwell until the scanner misses codes.                                                     | [Measuring a scanner's top rate](docs/guide.md#measuring-a-scanners-top-rate) |
| Check that a scanner tells symbologies apart     | The **Per row** editor: a UPC, then a QR Code, then a Data Matrix, in one list.                                    | [Per-row editor](docs/guide.md#per-row-editor)                                |
| Test 2D reads by an imager or a phone camera     | QR Code, Data Matrix, PDF417 or Aztec, at the error-correction level you choose.                                   | [Scanning 2D symbols](docs/guide.md#scanning-2d-symbols)                      |
| Test reads of tilted or slanted codes            | **Random rotation** and **Random skew**, up to 30° each.                                                           | [Rotation and skew](docs/guide.md#rotation-and-skew)                          |
| Test GS1 data, including a lane's rejection path | GS1 element strings or pasted scanner output. **Render GS1 data that fails validation** draws bad data on purpose. | [GS1](docs/guide.md#gs1)                                                      |
| Give a colleague the exact same test             | **Share**: a URL, or a QR code, that reproduces the list and every setting.                                        | [Sharing a test deck](docs/guide.md#sharing-a-test-deck)                      |

## Quick start

1. Open **[scandible](https://nzneit.github.io/scandible/)**.
2. Choose a **Format**, then paste your codes one per line, or upload a `.txt` or `.csv` file.
   Invalid codes are flagged and skipped.
3. Choose a **Playback** mode. **Scroll** moves the codes past at a set speed. **Step** shows one
   still code at a time for a set dwell, the time each code stays on screen.
4. Press **Start**. Scroll begins at once. A Step run opens paused: press **Play** or Space when
   the scanner is ready.
5. Point the scanner at the code in the middle of the screen.

If the scanner misses codes, lower the speed or raise the dwell. Both also change live during a
run.

## Formats

36 formats in three groups. Choose one for the whole list, or one per code in the **Per row**
editor. The default is UPC-A.

| Group       | Formats                                                                                                                                                                                                                                                                                            |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Linear (21) | CODE128 (auto, or forced A, B or C), EAN-13, EAN-8, EAN-5 and EAN-2 add-ons (each drawn on its own), UPC-A, UPC-E, CODE39, ITF, ITF-14, MSI with no check digit, MSI10, MSI11, MSI1010 and MSI1110 (mod 10, mod 11, mod 10 + mod 10 and mod 11 + mod 10 check digits), Pharmacode, Codabar, CODE93 |
| 2D (4)      | QR Code, Data Matrix, PDF417, Aztec                                                                                                                                                                                                                                                                |
| GS1 (11)    | GS1-128; GS1 DataBar Omnidirectional, Truncated, Stacked, Stacked Omnidirectional, Limited, Expanded and Expanded Stacked; GS1 DataMatrix; GS1 QR Code; GS1 DotCode                                                                                                                                |

## Before you start

- **scandible only shows codes.** It does not see what the scanner reads. Check reads and misses
  on the computer or system that the scanner sends to.
- **Flashing:** in Step mode, dwells under 0.33 s flash the screen more than three times a second.
  Do not use them near anyone sensitive to flashing lights.
- **Repeated codes:** many scanners ignore a code they have just read for a short time, often
  called the reread delay. If two neighboring codes are identical, lower the delay in the
  scanner's settings, or use Step with a gap (blank screen between codes) longer than the delay.
  In Step, the setup page warns you when neighbors match.
- **2D symbols** need a 2D area imager. Turn on the scanner's screen or mobile-display read mode
  if it has one.

## Contributing

To build, test or change scandible, see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © Nathan Neitman

The Application Identifier table in `src/lib/gs1-ais.json` is generated from GS1's
[Barcode Syntax Dictionary](https://github.com/gs1/gs1-syntax-dictionary), release 2026-01-27,
under the Apache License 2.0; see
[LICENSES/gs1-syntax-dictionary-Apache-2.0.txt](LICENSES/gs1-syntax-dictionary-Apache-2.0.txt).
