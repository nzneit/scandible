import { describe, it, expect } from 'vitest';
import { buildEntry } from './codes';
import type { FormatId } from './formats';
import { DENSE_HINT, GS1_HINT, LAX_NOTE, SCAN_HINT, verdictText } from './verdict';

const S = '(01)09501101530003(17)261231(10)LOT42';
const BAD = '(01)09501101530004';
/** 40 + b data characters: (01) 16, (10) + 20 A 22, (21) + b B. */
const LONG = (b: number) => '(01)09501101530003(10)' + 'A'.repeat(20) + '(21)' + 'B'.repeat(b);
/** The verdict of `payload` at `format` through the real engine, with the list's flag and level. */
const verdict = (payload: string, format: FormatId, lax = false, ecc = '') =>
	verdictText(buildEntry(payload, format, { format, ecc, lax }));

describe('verdictText for GS1 entries', () => {
	it('shows size, character count and the scan data for each carrier', () => {
		expect(verdict(S, 'gs1128')).toBe(
			' ✓ · 255 modules wide · 31 characters → ]C1 01095011015300031726123110LOT42'
		);
		expect(verdict('(10)LOT42(01)09501101530003', 'gs1128')).toBe(
			' ✓ · 222 modules wide · 23 characters → ]C1 10LOT42␝0109501101530003'
		);
		expect(verdict(S, 'gs1qr')).toBe(
			' ✓ · 25×25 modules · 31 characters → ]Q3 01095011015300031726123110LOT42'
		);
		expect(verdict(S, 'gs1datamatrix')).toBe(
			' ✓ · 18×18 modules · 31 characters → ]d2 01095011015300031726123110LOT42'
		);
		expect(verdict(S, 'gs1dotcode')).toBe(
			' ✓ · 29×20 modules · 31 characters → ]J1 01095011015300031726123110LOT42'
		);
		expect(verdict('(01)0950110153000', 'databaromni')).toBe(
			' ✓ · 96 modules wide · 16 characters → ]e0 0109501101530003'
		);
	});

	it('flags a lax render with the lint, and shows the corrected Expanded digit', () => {
		expect(verdict(BAD, 'gs1128', true)).toBe(
			' ⚠ rendered anyway · (01) GTIN: Bad checksum · 134 modules wide · 16 characters → ]C1 0109501101530004'
		);
		expect(verdict('(01)09501101530004(17)261231(10)LOT42', 'databarexpanded', true)).toBe(
			' ⚠ rendered anyway · (01) GTIN: Bad checksum · 281 modules wide · 31 characters → ]e0 01095011015300031726123110LOT42'
		);
		expect(verdict(BAD, 'gs1128')).toBe(' ✗ (01) GTIN: Bad checksum');
		expect(verdict(BAD, 'databarexpanded')).toBe(' ✗ (01) GTIN: Bad checksum');
	});

	it('notes dense symbols and the 48-character GS1-128 limit', () => {
		expect(verdict(LONG(10), 'gs1128')).toBe(
			' ✓ · 519 modules wide · 50 characters · dense · over the 48-character GS1-128 limit → ]C1 010950110153000310AAAAAAAAAAAAAAAAAAAA␝21BBBBBBBBBB'
		);
		expect(verdict(LONG(7), 'gs1128')).toBe(
			' ✓ · 486 modules wide · 47 characters · dense → ]C1 010950110153000310AAAAAAAAAAAAAAAAAAAA␝21BBBBBBB'
		);
		expect(verdict(LONG(8), 'gs1128')).not.toContain('over the');
		expect(verdict(LONG(9), 'gs1128')).toContain(' · over the 48-character GS1-128 limit → ');
		expect(verdict(LONG(10), 'gs1qr')).not.toContain('over the');
	});

	it('words the invalid states with the parentheses and override suffixes', () => {
		expect(verdict('(01)09501101530003(17)261345', 'gs1128')).toBe(
			' ✗ (17) USE BY or EXPIRY: Invalid month'
		);
		expect(verdict(BAD, 'databaromni')).toBe(
			' ✗ Incorrect GS1 DataBar Omnidirectional check digit provided'
		);
		expect(verdict(BAD, 'databaromni', true)).toBe(
			' ✗ Incorrect GS1 DataBar Omnidirectional check digit provided (the validation setting cannot override this)'
		);
		expect(verdict('(01)09501101530003(10)A(B)C', 'gs1128')).toBe(
			' ✗ (B) is not a GS1 Application Identifier (parentheses inside a value are not supported)'
		);
		expect(verdict('(', 'gs1128')).toBe(' ✗ invalid');
		expect(verdict('(1A)x', 'gs1128')).toBe(' ✗ (1A) is not a GS1 Application Identifier');
		expect(verdict('(90)' + 'x'.repeat(3000), 'gs1qr', true, 'H')).toBe(
			' ✗ too long for GS1 QR Code (level H) (the validation setting cannot override this)'
		);
	});

	it('names each identifier in a library message by its bracket and GS1 title', () => {
		expect(verdict('(01)09501101530003(02)09501101530003', 'gs1128')).toBe(
			' ✗ (02) and (01) cannot be in the same code'
		);
		expect(verdict('(10)A(10)B', 'gs1128')).toBe(
			' ✗ (10) appears more than once with different values'
		);
		expect(
			verdict('(01)09501101530003(10)LOT42(17)261234', 'databarexpandedstacked', true)
		).toContain(' ⚠ rendered anyway · (17) USE BY or EXPIRY: Invalid day of month · ');
	});

	it('never shows a bare "AI" in a GS1 verdict or hint', () => {
		const inputs = [
			BAD,
			'(01)',
			'(01)09501101530003(17)261345',
			'(01)09501101530003(10)LOT42(17)261234',
			'(1A)x',
			'(99999)123',
			'(01)09501101530003(10',
			'(01)09501101530003(02)09501101530003',
			'(10)A(10)B',
			'(01)09501101530003(10)A(B)C',
			'(01)09501101530003(10)Aé',
			'09501101530003',
			'01095011015300039Z45',
			'0109501101530003(10)LOT42',
			']d1ABC',
			']C1'
		];
		const shown = [DENSE_HINT, SCAN_HINT, LAX_NOTE, GS1_HINT];
		for (const format of ['gs1128', 'databarexpanded'] as const) {
			for (const input of inputs) {
				shown.push(verdict(input, format), verdict(input, format, true));
			}
		}
		expect(shown.filter((text) => /\bAIs?\b/.test(text))).toEqual([]);
	});

	it.each([
		['gs1128', "Application Identifiers must end with ')'"],
		['databaromni', 'GS1 DataBar Omnidirectional must be 13 or 14 digits'],
		['databartruncated', 'GS1 DataBar Truncated must be 13 or 14 digits'],
		['databarstacked', 'GS1 DataBar Stacked must be 13 or 14 digits'],
		['databarstackedomni', 'GS1 DataBar Stacked Omnidirectional must be 13 or 14 digits'],
		['databarlimited', 'GS1 DataBar Limited must be 13 or 14 digits'],
		['databarexpanded', "Application Identifiers must end with ')'"],
		['databarexpandedstacked', "Application Identifiers must end with ')'"],
		['gs1datamatrix', "Application Identifiers must end with ')'"],
		['gs1qr', "Application Identifiers must end with ')'"],
		['gs1dotcode', "Application Identifiers must end with ')'"]
	] as const)('refuses an unclosed bracket on %s with the carrier’s message', (id, message) => {
		expect(verdict('(01)09501101530003(10', id)).toBe(` ✗ ${message}`);
		expect(verdict('(01)09501101530003(10', id, true)).toBe(
			` ✗ ${message} (the validation setting cannot override this)`
		);
	});

	it('adds the override suffix to every refused GS1 code under the setting, and to nothing else', () => {
		const O = ' (the validation setting cannot override this)';
		expect(verdict('(', 'gs1128', true)).toBe(' ✗ invalid' + O);
		expect(verdict('09501101530003', 'gs1128', true)).toBe(
			' ✗ No GS1 Application Identifier starts at "09501101…"; GS1 data starts with an Application Identifier, such as 01 before a GTIN' +
				O
		);
		expect(verdict('(01)09501101530003(10)A(B)C', 'databaromni', true)).toBe(
			' ✗ GS1 DataBar Omnidirectional must be 13 or 14 digits (parentheses inside a value are not supported)' +
				O
		);
		expect(verdict('x'.repeat(2000), 'qr', true, 'H')).toBe(' ✗ too long for QR Code (level H)');
		expect(verdict('bad', 'upc', true)).toBe(' ✗ invalid');
	});

	it.each([
		[
			'gs1128',
			']C101095011015300031726123110LOT42',
			' ✓ · 255 modules wide · 31 characters → ]C1 01095011015300031726123110LOT42'
		],
		[
			'gs1128',
			'10LOT42<GS>0109501101530003',
			' ✓ · 222 modules wide · 23 characters → ]C1 10LOT42␝0109501101530003'
		],
		[
			'gs1128',
			']C1010950110153000310LOT42<GS>17261231',
			' ✓ · 266 modules wide · 31 characters → ]C1 010950110153000310LOT42␝17261231'
		],
		[
			'gs1128',
			']d201095011015300031726123110LOT42',
			' ✓ · 255 modules wide · 31 characters · scan data from GS1 DataMatrix (]d2) → ]C1 01095011015300031726123110LOT42'
		],
		[
			'databaromni',
			']e00109501101530003',
			' ✓ · 96 modules wide · 16 characters → ]e0 0109501101530003'
		],
		[
			'gs1128',
			']d1ABC',
			' ✗ ]d1 is not a GS1 symbology identifier; GS1 scan data starts with ]C1, ]e0, ]d2, ]Q3 or ]J1, or with its first Application Identifier'
		],
		[
			'gs1128',
			']c10109501101530003',
			' ✗ ]c1 is not a GS1 symbology identifier; identifiers are case-sensitive, use ]C1'
		],
		[
			'gs1128',
			'01095011015300039Z45',
			' ✗ No GS1 Application Identifier starts at "9Z45" after (01)'
		],
		[
			'gs1128',
			'09501101530003',
			' ✗ No GS1 Application Identifier starts at "09501101…"; GS1 data starts with an Application Identifier, such as 01 before a GTIN'
		],
		[
			'gs1128',
			'0109501101530003(10)LOT42',
			' ✗ Brackets and scan data cannot be mixed; put every Application Identifier in brackets or none (stopped at "(10)LOT4…" after (01))'
		],
		['gs1128', '010950110153', ' ✗ (01) takes 14 characters; only 10 follow'],
		['gs1128', '10<GS>17261231', ' ✗ (10) has no value'],
		[
			'gs1128',
			'10A(B)C',
			' ✗ (10) contains a parenthesis; parentheses inside a value are not supported'
		],
		['gs1128', ']C1', ' ✗ No Application Identifiers in the scan data']
	] as const)('reads raw %s input %s', (id, raw, expected) => {
		expect(verdict(raw, id)).toBe(expected);
	});

	it('notes scan data from another carrier, and only then', () => {
		expect(verdict(']Q30109501101530004', 'gs1128', true)).toBe(
			' ⚠ rendered anyway · (01) GTIN: Bad checksum · 134 modules wide · 16 characters · scan data from GS1 QR Code (]Q3) → ]C1 0109501101530004'
		);
		for (const [aim, name] of [
			[']C1', 'GS1-128'],
			[']e0', 'GS1 DataBar'],
			[']d2', 'GS1 DataMatrix'],
			[']J1', 'GS1 DotCode']
		]) {
			expect(verdict(`${aim}0109501101530003`, 'gs1qr')).toContain(
				` · scan data from ${name} (${aim}) → ]Q3 `
			);
		}
		expect(verdict(']Q30109501101530003', 'gs1qr')).not.toContain('scan data from');
		expect(verdict('0109501101530003', 'gs1qr')).not.toContain('scan data from');
	});

	it('never adds the UTF-8 clause to a GS1 row, and leaves other rows as before', () => {
		const lenient = verdict('(01)09501101530003(10)Aé', 'gs1128', true);
		expect(lenient).toMatch(
			/^ ⚠ rendered anyway · \(10\) BATCH\/LOT: Invalid CSET 82 character · \d+ modules wide · 20 characters → \]C1 010950110153000310Aé$/
		);
		expect(lenient).not.toContain('UTF-8');
		expect(verdict('036000291452', 'upc')).toBe(' ✓');
		expect(verdict('590123412345', 'ean13')).toBe(' ✓ → 5901234123457');
		expect(verdict('hello world', 'qr')).toBe(' ✓ · 21×21 modules · 11 bytes');
		expect(verdict('héllo → 日本', 'qr')).toBe(' ✓ · 25×25 modules · 17 bytes · UTF-8, no ECI');
		expect(verdict('x'.repeat(2000), 'qr', false, 'H')).toBe(' ✗ too long for QR Code (level H)');
		expect(verdict('bad', 'upc')).toBe(' ✗ invalid');
	});
});

describe('hint texts', () => {
	it('are the spec’s copy', () => {
		expect(DENSE_HINT).toBe(
			'Dense: more than 100 modules across (PDF417 and the linear GS1 formats: 300), so each module is small on screen. If the scanner misses these, shorten the payload, lower error correction if the format offers it, or go full screen.'
		);
		expect(SCAN_HINT).toBe(
			'After → is what a scanner sends when it transmits its symbology identifier (]C1, ]e0, ]d2, ]Q3 or ]J1); ␝ marks a GS separator. Keyboard-wedge scanners usually omit the identifier and may drop or change the separator. Character counts exclude both.'
		);
		expect(LAX_NOTE).toBe(
			'Ticked, a code that fails GS1 validation is drawn anyway, flagged amber with the reason. Three kinds of failure can never be overridden: malformed brackets, scan data that cannot be read (an unknown Application Identifier or symbology identifier, or a parenthesis in a value), and a code too long for its symbol. Separately, GS1 DataBar Omnidirectional, Truncated, Stacked, Stacked Omnidirectional and Limited still refuse a wrong GTIN, and GS1 DataBar Expanded and Expanded Stacked carry the corrected check digit of a leading GTIN.'
		);
		expect(GS1_HINT).toBe(
			'GS1 formats take bracketed element strings, such as (01)09501101530003(10)LOT42, or scanner output, such as ]C1010950110153000310LOT42<GS>17261231; the ]C1-style symbology identifier is optional. Each bracketed number is a GS1 Application Identifier, which names the value after it: (01) marks a GTIN. Write a separator as the GS character, ␝, <GS>, \\x1d or \\u001d. If a keyboard-wedge scanner drops separators, set it to send <GS>. One code per line; spaces and line breaks are removed, commas are data, and parentheses inside a value are not supported.'
		);
	});
});
