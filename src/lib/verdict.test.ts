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
			' ⚠ rendered anyway · AI 01: Bad checksum · 134 modules wide · 16 characters → ]C1 0109501101530004'
		);
		expect(verdict('(01)09501101530004(17)261231(10)LOT42', 'databarexpanded', true)).toBe(
			' ⚠ rendered anyway · AI 01: Bad checksum · 281 modules wide · 31 characters → ]e0 01095011015300031726123110LOT42'
		);
		expect(verdict(BAD, 'gs1128')).toBe(' ✗ AI 01: Bad checksum');
		expect(verdict(BAD, 'databarexpanded')).toBe(' ✗ AI 01: Bad checksum');
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
		expect(verdict('(01)09501101530003(17)261345', 'gs1128')).toBe(' ✗ AI 17: Invalid month');
		expect(verdict(BAD, 'databaromni')).toBe(
			' ✗ Incorrect GS1 DataBar Omnidirectional check digit provided'
		);
		expect(verdict(BAD, 'databaromni', true)).toBe(
			' ✗ Incorrect GS1 DataBar Omnidirectional check digit provided (the validation setting cannot override this)'
		);
		expect(verdict('(01)09501101530003(10)A(B)C', 'gs1128')).toBe(
			' ✗ AI B: Unrecognised AI (parentheses inside a value are not supported)'
		);
		expect(verdict('(90)' + 'x'.repeat(3000), 'gs1qr', true, 'H')).toBe(
			' ✗ too long for GS1 QR Code (level H)'
		);
	});

	it.each([
		['gs1128', "AIs must start with '('"],
		['databaromni', 'GS1 DataBar Omnidirectional must be 13 or 14 digits'],
		['databartruncated', 'GS1 DataBar Truncated must be 13 or 14 digits'],
		['databarstacked', 'GS1 DataBar Stacked must be 13 or 14 digits'],
		['databarstackedomni', 'GS1 DataBar Stacked Omnidirectional must be 13 or 14 digits'],
		['databarlimited', 'GS1 DataBar Limited must be 13 or 14 digits'],
		['databarexpanded', "AIs must start with '('"],
		['databarexpandedstacked', "AIs must start with '('"],
		['gs1datamatrix', "AIs must start with '('"],
		['gs1qr', "AIs must start with '('"],
		['gs1dotcode', "AIs must start with '('"]
	] as const)('refuses a missing bracket on %s with the carrier’s message', (id, message) => {
		expect(verdict('0109501101530003', id)).toBe(` ✗ ${message}`);
		expect(verdict('0109501101530003', id, true)).toBe(` ✗ ${message}`);
	});

	it('never adds the UTF-8 clause to a GS1 row, and leaves other rows as before', () => {
		const lenient = verdict('(01)09501101530003(10)Aé', 'gs1128', true);
		expect(lenient).toMatch(
			/^ ⚠ rendered anyway · AI 10: Invalid CSET 82 character · \d+ modules wide · 20 characters → \]C1 010950110153000310Aé$/
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
			'Ticked, a code that fails GS1 validation is drawn anyway, flagged amber with the reason. It cannot help with missing brackets or a code too long for its symbol; GS1 DataBar Omnidirectional, Truncated, Stacked, Stacked Omnidirectional and Limited still refuse a wrong GTIN; and GS1 DataBar Expanded and Expanded Stacked carry the corrected check digit of a leading GTIN.'
		);
		expect(GS1_HINT).toBe(
			'GS1 formats take bracketed element strings, such as (01)09501101530003(10)LOT42, one code per line. Spaces and line breaks are removed, commas are data, and parentheses inside a value are not supported.'
		);
	});
});
