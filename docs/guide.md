# scandible guide

The full reference for [scandible](https://nzneit.github.io/scandible/). For the overview and a
quick start, see the [README](../README.md).

## Contents

1. [Entering codes](#entering-codes)
2. [Reading the code list](#reading-the-code-list)
3. [Per-row editor](#per-row-editor)
4. [Playback](#playback)
5. [Measuring a scanner's top rate](#measuring-a-scanners-top-rate)
6. [Rotation and skew](#rotation-and-skew)
7. [Scanning 2D symbols](#scanning-2d-symbols)
8. [GS1](#gs1)
9. [Sharing a test deck](#sharing-a-test-deck)
10. [Browser support](#browser-support)
11. [Scanner settings and troubleshooting](#scanner-settings-and-troubleshooting)

## Entering codes

There are three ways to enter a list:

- **Paste** it into the text box.
- **Upload** a `.txt` or `.csv` file with **Upload file**, at the top of the **Codes** section. The
  file replaces the text in the box.
- **Open a link** that carries the list. See [Sharing a test deck](#sharing-a-test-deck).

How the list splits into codes depends on the format:

| Format                                     | One code is                                                       |
| ------------------------------------------ | ----------------------------------------------------------------- |
| Numeric: EAN, UPC, ITF, MSI and Pharmacode | one line, or one comma-separated item                             |
| 2D and other text formats                  | one line; commas are part of the code                             |
| GS1                                        | one line; spaces and line breaks are dropped, and commas are data |

Choose the format in the **Format** select. The default is UPC-A.

For QR Code, GS1 QR Code, PDF417 and Aztec, an **Error correction** select sets the level for the
whole list. The defaults are level M for QR Code and GS1 QR Code, automatic for PDF417 and ≥23% for
Aztec. A higher level survives more damage but makes a bigger symbol.

To give each code its own format or level, or a payload of several lines, use the
[per-row editor](#per-row-editor).

## Reading the code list

Under the code box, the list shows one line per code, with a verdict:

- **✓ valid** means the code will play. When the encoder adds a check digit or normalizes the
  input, the line shows the exact value the scanner will read after an arrow: `✓ valid → …`.
- **✗ invalid** means the code is skipped. The reason follows when there is one, for example
  `✗ invalid: too long for QR Code (level H)`.
- **2D codes** show the symbol size (for example `25×25 modules`), the byte count and, when it
  applies, `dense`. Text with non-ASCII characters also shows `UTF-8, no ECI`; see
  [Scanner settings and troubleshooting](#scanner-settings-and-troubleshooting).
- **GS1 codes** show the data as the scanner sends it. See [GS1](#gs1).

A module is the smallest bar or square in a symbol. A **dense** symbol is more than 100 modules
across (300 for PDF417 and the linear GS1 formats), so each module is small on screen. If the
scanner misses dense codes, shorten the payload, lower the error correction if the format has it,
or use the browser's full screen.

A code too long for its error-correction level is flagged. Choose a lower level or shorten the
code.

Only valid codes play, and every counter counts valid codes only.

## Per-row editor

The **Editor** switch at the top of the **Codes** section chooses how you enter the list:

- **Plain text**, the default, is one text box: one format and one error-correction level for the
  whole list, and one code per line.
- **Per row** gives each code its own row, with its own format and, where the format has one, its
  own error-correction level. Each GS1 row also has its own **Render if invalid** box (see
  [GS1](#gs1)).

Use Per row to mix symbologies in one list, such as a UPC, then a QR Code, then a Data Matrix, and
test how a scanner tells them apart. Use it also for a 2D payload of several lines, such as a
vCard.

### Working with rows

- In a row, Enter starts a new line inside the payload. Numeric formats such as UPC drop line
  breaks, as they drop other whitespace.
- A comma never splits a row: one row is one code.
- Each row shows its verdict, with the same details as the Plain text list. Blank rows are skipped.
- **Add code** appends a row in the format chosen under **Format for new rows**.
- The ↑ and ↓ buttons (**Move up**, **Move down**) reorder rows, and ✕ (**Delete**) removes one.
- Uploading a file adds one row per code after the existing rows.

### Switching between Plain text and Per row

- **To Per row:** the list becomes rows, each with the list's format and level. Blank lines and the
  commas between codes are not kept.
- **To Plain text:** the rows join back into the text box, and the first code's format and level
  apply to the whole list.

A switch that loses nothing happens at once. When switching to Plain text would lose something, a
note says what:

- how many rows would lose their format or level
- how many payloads would be cut at line breaks or commas
- which format every code will take

Choose **Switch anyway** or **Cancel**.

If you edit the rows while the note is open, and the edit changes what would be lost, your first
click on **Switch anyway** shows the updated note instead of switching. Click again to switch. If
the edit means nothing would be lost, the first click switches.

For links to a per-row list, see [Sharing a test deck](#sharing-a-test-deck).

## Playback

The **Playback mode** switch chooses how codes reach the scanner.

|              | **Scroll**                                                           | **Step**                                                                                                                           |
| ------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| What it does | Moves the column of codes smoothly past the screen at a steady speed | Shows one code at a time, still and centered, then replaces it with the next                                                       |
| Settings     | **Speed**: 10–5000 px/s, default 60                                  | **Dwell**: 0.05–5 s per code, default 1 s. **Gap**: 0–2 s of blank screen between codes, default 0 (the next code appears at once) |
| Use it for   | A long list, read by a scanner that tolerates motion                 | Throughput tests, 2D symbols, phone cameras, and any scanner that misses codes in motion                                           |

Set the dwell and gap with the slider, or type seconds into the field beside it. Speed, dwell and
gap all change live during a run as well.

> **Flashing:** dwells under 0.33 s flash the screen more than three times a second. Do not use
> them near anyone sensitive to flashing lights.

**Loop** repeats the list without a break. With Loop off, the run ends on a **Run finished** screen.
Scroll lists **Barcodes** (the number of codes) and **Playback time** (the time on the playback
clock); Step adds **Dwell** and **Gap** (each with the value it started at, if it changed during the
run) and, when it was measured, **Refresh rate** (the display's refresh rate, with how many frames
took over 100 ms, if any). **Back** returns to setup, **Restart** starts the run again from the
first code (in Step, paused), and a screen reader also hears the run as one sentence.

### During a run

Playback fills the screen with a single column of codes. The controls sit in an overlay at the
bottom of the screen, in this order:

- **Back** to the setup page, which keeps the speed, dwell and gap you set during the run
- **Restart**, then **Prev**, **Play** / **Pause** and **Next** (Prev and Next in Step), as icon
  buttons; point at one, or move focus to it, to see its name
- in Step, the code number on a window 768 px wide or wider (the line in the top-left corner always
  shows it), then **Dwell** and **Gap**, each a slider with a seconds field
- in Scroll, **Speed**, with its value in px/s

The overlay hides 3 seconds after the last input while a run plays, unless a control in it has
keyboard focus (a button you clicked does not keep it up); while a run is paused it stays. Move the
pointer, tap the screen or press Tab to bring it back; in Step, any key brings it back too. The
overlay's Tab order starts at **Back**. In Scroll, press Tab until **Pause** has focus, then Enter
or Space, to pause.

In Step, the keyboard works too: Space plays and pauses, and ← and → step back and forward.

A Step run opens paused on the first code. Press **Play** or Space when the scanner is ready. The
line in the top-left corner always shows the code number, dwell and gap.

**Keep-awake.** While a run plays, scandible asks the browser to keep the screen awake, so a phone
or tablet does not dim or lock in the middle of a long run. It lets go when you pause, when the run
ends and when you leave the page, so a paused device sleeps as usual. When the screen cannot be kept
awake, the overlay says so:

- _This browser can't keep the screen awake._ The browser is too old, or the page was opened over
  plain HTTP.
- _Keep-awake was blocked, perhaps by battery saver._ Battery saver is on, or the page runs inside
  another site's frame that does not allow it. A tap or a key press asks again.

On iOS before 18.4, a Home Screen web app may not keep the screen awake, and no note shows. In each
case, raise the device's screen timeout for the run. Keeping the screen lit costs battery, most of
all during a long run with **Loop** on.

## Measuring a scanner's top rate

scandible does not see what the scanner reads. Count reads where the scanner sends them, and
compare them with the list.

1. Enter a list of different codes, so the reread delay cannot hide a miss (see
   [Scanner settings and troubleshooting](#scanner-settings-and-troubleshooting)).
2. Choose **Step**, turn **Loop** on, and press **Start**, then **Play**.
3. Lower the dwell from the overlay until the scanner starts missing codes. The line in the
   top-left corner shows the current dwell. Note the lowest dwell at which the scanner read every
   code.
4. Press **Back**. Set the dwell you noted, turn **Loop** off, and press **Start**, then **Play**.
5. When the run ends, read the **Run finished** screen. It shows:
   - **Dwell** and **Gap**, with the starting value if either changed during the run
   - **Playback time**, the time on the playback clock
   - **Refresh rate**, with how many frames took over 100 ms, if any

For a run of _n_ codes, expect the playback clock to read about:

```
n × dwell + (n − 1) × gap
```

Why the clock can differ from that:

- The screen shows each code for whole display frames, so a dwell rounds up to the next frame. At
  60 Hz, 0.06 s runs as 0.067 s.
- Paused time and time in a hidden browser tab are not counted.
- If the browser stalls for more than 0.1 s, the clock counts only 0.1 s for that frame, and the
  summary says how many stalls there were. During a stall, a code stays on screen longer than the
  dwell and the scanner gets extra time, so run the test again.
- Only valid codes are counted.

## Rotation and skew

To test how a scanner copes with codes that are not square to it, turn on **Random rotation**
(tilt), **Random skew** (slant) or both. Each slider sets the largest angle, from 1° to 30°, with a
default of 8°. Every code gets its own random angle within that limit, in Scroll and in Step.

The angles come from a random seed. A share link carries the seed, so the same link gives the same
angles every time.

## Scanning 2D symbols

- A 2D area imager is required.
- Turn on the scanner's screen or mobile-display read mode if it has one.
- Start at 60 px/s, or use Step at a 1 s dwell. Use the browser's full screen for dense symbols.
- Non-ASCII text is encoded as UTF-8 without an ECI marker, so scanners that assume Latin-1 show it
  garbled.
- 2D symbols carry no human-readable caption, so count misses against the list.

## GS1

The **GS1** group holds eleven carriers: GS1-128; GS1 DataBar Omnidirectional, Truncated, Stacked,
Stacked Omnidirectional, Limited, Expanded and Expanded Stacked; GS1 DataMatrix; GS1 QR Code; and
GS1 DotCode.

### Entering GS1 data

GS1 formats take two kinds of input, one code per line.

**Bracketed element strings:**

```
(01)09501101530003(17)261231(10)LOT42
```

Each bracketed number is a GS1 Application Identifier, which names the value after it: `(01)`
marks a GTIN, `(17)` a use-by or expiry date and `(10)` a batch or lot.

**Scanner output**, as a scanner sends it:

```
]C1010950110153000310LOT42<GS>17261231
```

The list reads this as `(01)09501101530003(10)LOT42(17)261231`.

- The symbology identifier at the start (`]C1`, `]e0`, `]d2`, `]Q3` or `]J1`) is optional.
- If the identifier names a different carrier, the code still draws in the format you chose, and
  the verdict notes where the data came from. So you can paste a scan from one GS1 carrier and draw
  it on any other carrier that can hold its Application Identifiers.
- Write a GS separator as the character itself, `␝`, `<GS>`, `\x1d` or `\u001d`.
- Any code that does not start with `(` is read as scanner output. So a code without brackets that
  you meant to fail may be read successfully and draw.

For both kinds, spaces and line breaks inside a code are dropped, commas are data, and parentheses
inside a value are not supported.

### What the list shows for GS1

Each code is checked against GS1's rules for its Application Identifiers. A code that fails shows
the reason:

```
✗ invalid: (01) GTIN: Bad checksum
```

A valid code shows what a scanner sends:

```
✓ valid · 255 modules wide · 31 characters → ]C1 01095011015300031726123110LOT42
```

After the arrow comes the symbology identifier, which a scanner adds when set to transmit one, then
the data, with `␝` where a GS separator goes.

| Carrier                 | Symbology identifier |
| ----------------------- | -------------------- |
| GS1-128                 | `]C1`                |
| GS1 DataBar (all seven) | `]e0`                |
| GS1 DataMatrix          | `]d2`                |
| GS1 QR Code             | `]Q3`                |
| GS1 DotCode             | `]J1`                |

- Keyboard-wedge scanners usually omit the identifier, and may drop or change the separator. The
  character count excludes both.
- GS1 caps GS1-128 at 48 data characters. A longer one is noted and still plays.
- GS1 symbols carry no caption, linear ones included. The list shows the data instead.

Under each drawn GS1 code, a collapsed section lists its Application Identifiers with GS1's names
and lightly decoded values: dates as `2026-12-31`, times as `14:30`, and weights, measures and
amounts with their decimal point. Where the data cannot be split into Application Identifiers, it
shows where reading stops.

### Testing a rejection path

**Render GS1 data that fails validation**, off by default, draws a failing code anyway, flagged
amber with the reason, so you can test how a lane rejects bad data. An amber code counts as valid:
it plays, and the counters include it.

Three kinds of failure are never drawn:

- malformed brackets
- scan data that cannot be read
- a code too long for its symbol

Some carriers also protect the GTIN, whether the box is ticked or not:

- GS1 DataBar Omnidirectional, Truncated, Stacked, Stacked Omnidirectional and Limited refuse a
  wrong GTIN.
- GS1 DataBar Expanded and Expanded Stacked carry the corrected check digit of a leading GTIN, so a
  wrong one cannot reach the scanner from them.

To test how a lane rejects a wrong GTIN check digit, use GS1-128, GS1 DataMatrix, GS1 QR Code or
GS1 DotCode.

Switching to a non-GS1 format clears the box, as it clears the error-correction level. In the
per-row editor, each GS1 row has its own **Render if invalid** box.

### Carrier notes

- The stacked DataBar members are multi-row symbols. A laser scanner may need several passes; an
  imager reads them at once.
- To mix GS1 carriers with other formats in one list, use the [per-row editor](#per-row-editor).

## Sharing a test deck

**Share**, in the bar at the bottom of the window, opens the Share panel. The panel shows a URL
that reproduces the exact list and settings, and the same link as a QR code, so a phone can open
it. While the panel is open, the link and the QR code follow every change you make. **Copy link**
copies the URL. Close the panel with ✕ or Escape.

- **QR error correction** sets the QR code's level: L (most capacity), M (the default), Q or H.
- A status line says when the link makes a dense QR code, or is too long for a QR code at the
  chosen level, and why. The link itself always works.

### What a link contains

A link keeps the list and settings in the URL fragment, the part after `#`, so a server never
refuses a long list. Older links that use `?codes=` still work. A per-row link opens in the per-row
editor; every other link opens in Plain text.

| Parameter         | Meaning                                                                   |
| ----------------- | ------------------------------------------------------------------------- |
| `codes`           | The list, one code per line                                               |
| `r1`, `r2`, …     | A per-row list, used instead of `codes`. See below.                       |
| `fmt`             | The list's format, for example `upc`, `qr` or `gs1128`                    |
| `ecc`             | The list's error-correction level, only when it is not the default        |
| `lax`             | `1` when a GS1 list renders data that fails validation                    |
| `speed`           | Scroll speed in px/s                                                      |
| `loop`            | `1` to loop, `0` to run once                                              |
| `mode`            | `step` for Step playback; left out for Scroll                             |
| `dwell`, `gap`    | Step dwell and gap in milliseconds, only when they differ from 1000 and 0 |
| `rot`, `rotmax`   | Random rotation on (`1`) or off (`0`), and its largest angle in degrees   |
| `skew`, `skewmax` | Random skew on (`1`) or off (`0`), and its largest angle in degrees       |
| `seed`            | The random seed for rotation and skew                                     |

A per-row link carries one parameter per code, numbered from 1 in list order and skipping blank
rows. Each is tagged with the code's format, its level when that is not the default, and `lax` when
the row renders invalid GS1 data:

```
#r1=upc_012345678905&r2=qr-H_…&r3=gs1128-lax_…
```

## Browser support

scandible needs Chrome or Edge 111, Safari 16.4, or Firefox 128, or a later version. In older
browsers the pages can lose their colors or layout.

## Scanner settings and troubleshooting

**The scanner misses codes.** Lower the speed or raise the dwell. For 2D symbols, see
[Scanning 2D symbols](#scanning-2d-symbols); for dense ones, see
[Reading the code list](#reading-the-code-list).

**The scanner skips a repeated code.** In presentation (hands-free) mode, many scanners ignore a
code they have just read until a short timeout ends, often called the reread delay. If neighboring
codes are identical, lower the delay in the scanner's settings, or use Step with a gap longer than
the delay. In Step, the setup page warns when neighbors match.

**A code left on screen reads once, or several times.** This differs by model: some scanners read a
code left on screen once, and some read it again after the reread delay.

**A run pauses or resumes by itself.** A keyboard-wedge scanner plugged into the computer that shows
the codes types into the page. In Step, a space in a scanned code then pauses or resumes the run. A
scanner that ends each scan with Enter presses whichever overlay control has focus, such as **Play**
after you click it, so click the page, not a control, before you scan. A scanner that ends each scan
with Tab moves focus through the overlay's controls, so set it to end each scan with Enter or with
nothing. Or connect the scanner to another computer.

**GS1 values run together.** A keyboard-wedge scanner that drops GS separators makes a
variable-length value swallow what follows. Set the scanner to send `<GS>`.

**Non-ASCII text comes out garbled.** 2D codes carry non-ASCII text as UTF-8 without an ECI marker,
and scanners that assume Latin-1 show it garbled. The list marks such codes `UTF-8, no ECI`.

**A stacked DataBar code needs several passes.** Stacked DataBar members are multi-row symbols. A
laser scanner may need several passes; an imager reads them at once.
