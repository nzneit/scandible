import { describe, it, expect, vi } from 'vitest';
import { readCodesFile } from '$lib/fileInput';
import { decodeShareUrl } from './shareUrl';
import { Setup } from './setup.svelte';

vi.mock('$lib/fileInput', () => ({ readCodesFile: vi.fn() }));

/** A Setup for `link`, made as the page makes it; the seed is the link's, else 0. */
const open = (link: string) => {
	const decoded = decodeShareUrl(new URL('http://localhost/' + link));
	return new Setup(decoded, decoded.settings.seed ?? 0);
};
const file = () => new File(['x'], 'codes.txt', { type: 'text/plain' });
/** A readCodesFile call that settles only when the test says so. */
const deferred = () => {
	let settle!: { resolve: (text: string) => void; reject: (error: Error) => void };
	vi.mocked(readCodesFile).mockReturnValueOnce(
		new Promise<string>((resolve, reject) => (settle = { resolve, reject }))
	);
	return settle;
};
const MIXED = '#r1=upc_036000291452&r2=qr-H_hello&r3=datamatrix_line+1%0Aline+2&seed=0';
const ERROR = 'Could not read file';

describe('Setup', () => {
	it('opens a link with its codes and settings, and a records link in Per row', () => {
		const text = open('#codes=hello%0Aworld&speed=120&seed=5&fmt=qr&ecc=H');
		expect([text.editor, text.text, text.format, text.ecc]).toEqual([
			'text',
			'hello\nworld',
			'qr',
			'H'
		]);
		expect([text.speedPxPerSec, text.seed, text.rows]).toEqual([120, 5, []]);

		const rows = open('#r1=upc_036000291452&r2=qr-H_hello&seed=0');
		expect([rows.editor, rows.text]).toEqual(['rows', '']);
		expect(rows.rows).toEqual([
			{ payload: '036000291452', format: 'upc', ecc: '', lax: false },
			{ payload: 'hello', format: 'qr', ecc: 'H', lax: false }
		]);

		const empty = open('');
		expect([empty.editor, empty.format, empty.mode, empty.dwellMs, empty.gapMs]).toEqual([
			'text',
			'upc',
			'scroll',
			1000,
			0
		]);
	});

	it('keeps the level and the GS1 flag of the link', () => {
		const setup = open('#codes=x&seed=0&fmt=gs1qr&ecc=H&lax=1');
		expect([setup.format, setup.ecc, setup.lax]).toEqual(['gs1qr', 'H', true]);
	});

	it('canonicalizes the level and the GS1 flag when the format changes', () => {
		const qr = open('#codes=x&seed=0&fmt=qr&ecc=H');
		qr.format = 'aztec';
		expect(qr.ecc).toBe('');
		qr.format = 'qr';
		expect([qr.format, qr.ecc]).toEqual(['qr', '']);

		const gs1 = open('#codes=x&seed=0&fmt=gs1128&lax=1');
		gs1.format = 'gs1qr';
		expect(gs1.lax).toBe(true);
		gs1.format = 'upc';
		expect(gs1.lax).toBe(false);
		gs1.format = 'gs1128';
		expect(gs1.lax).toBe(false);
	});

	it('counts ready and skipped entries; blank lines and blank rows are not entries', () => {
		const setup = open('#codes=036000291452&seed=0');
		setup.text = '036000291452\n\nbad\n';
		expect(setup.entries).toHaveLength(2);
		expect(setup.counts).toEqual({ ready: 1, skipped: 1 });
		expect(setup.canStart).toBe(true);
		setup.text = 'bad';
		expect(setup.counts).toEqual({ ready: 0, skipped: 1 });
		expect(setup.canStart).toBe(false);
		setup.text = '';
		expect(setup.counts).toEqual({ ready: 0, skipped: 0 });

		const lenient = open('#codes=%2801%2909501101530004&seed=0&fmt=gs1128&lax=1');
		expect(lenient.counts).toEqual({ ready: 1, skipped: 0 });

		const rows = open('#r1=upc_036000291452&seed=0');
		rows.rows.push({ payload: ' ', format: 'upc', ecc: '', lax: false });
		expect(rows.entries).toHaveLength(1);
		expect(rows.counts).toEqual({ ready: 1, skipped: 0 });
	});

	it('switches to Per row at the list format and level, clearing the file error', () => {
		const setup = open('#codes=hello%0Aworld&seed=0&fmt=qr&ecc=H');
		setup.fileError = ERROR;
		expect(setup.selectEditor('rows')).toBe('to-rows');
		expect(setup.editor).toBe('rows');
		expect(setup.rows.map((row) => [row.payload, row.format, row.ecc])).toEqual([
			['hello', 'qr', 'H'],
			['world', 'qr', 'H']
		]);
		expect(setup.fileError).toBe('');
		expect(setup.selectEditor('rows')).toBe('unchanged');
	});

	it('switches back to Plain text at once when nothing is lost', () => {
		const setup = open('#codes=hello%0Aworld&seed=0&fmt=qr&ecc=H');
		setup.selectEditor('rows');
		expect(setup.selectEditor('text')).toBe('to-text');
		expect([setup.editor, setup.text, setup.format, setup.ecc, setup.pending]).toEqual([
			'text',
			'hello\nworld',
			'qr',
			'H',
			null
		]);
	});

	it('opens the note on a lossy switch; Cancel closes it and keeps the file error', () => {
		const setup = open(MIXED);
		setup.fileError = ERROR;
		expect(setup.selectEditor('text')).toBe('pending');
		expect(setup.editor).toBe('rows');
		expect(setup.pending?.loses).toEqual({ formats: 2, levels: 0, splits: 1, validation: 0 });
		expect(setup.fileError).toBe('');

		setup.fileError = ERROR;
		setup.cancelSwitch();
		expect([setup.pending, setup.editor, setup.fileError]).toEqual([null, 'rows', ERROR]);
	});

	it("switches anyway to the first code's format, clearing the file error", () => {
		const setup = open(MIXED);
		setup.selectEditor('text');
		setup.fileError = ERROR;
		expect(setup.switchAnyway()).toBe(true);
		expect([setup.editor, setup.text, setup.format, setup.pending, setup.fileError]).toEqual([
			'text',
			'036000291452\nhello\nline 1\nline 2',
			'upc',
			null,
			''
		]);
	});

	it('switches anyway when the rows changed and now lose nothing', () => {
		const setup = open(MIXED);
		setup.selectEditor('text');
		setup.rows = setup.rows.slice(0, 1);
		expect(setup.switchAnyway()).toBe(true);
		expect([setup.editor, setup.text]).toEqual(['text', '036000291452']);
	});

	it('refreshes a stale note on Switch anyway, and switches on the second call', () => {
		const setup = open(MIXED);
		setup.selectEditor('text');
		// As the row editor's format setter does: a new row object at the canonical level.
		setup.rows[1] = { ...setup.rows[1], format: 'upc', ecc: '' };
		expect(setup.switchAnyway()).toBe(false);
		expect(setup.editor).toBe('rows');
		expect(setup.pending?.loses).toEqual({ formats: 1, levels: 0, splits: 1, validation: 0 });
		expect(setup.switchAnyway()).toBe(true);
		expect(setup.editor).toBe('text');
	});

	it('replaces the text with a file in Plain text', async () => {
		const setup = open('#codes=036000291452&seed=0');
		vi.mocked(readCodesFile).mockResolvedValueOnce('a\nb');
		const f = file();
		await setup.loadFile(f);
		expect(readCodesFile).toHaveBeenLastCalledWith(f);
		expect(setup.text).toBe('a\nb');
	});

	it('appends a file as rows at the format for new rows, the default level and the flag off', async () => {
		const setup = open('#r1=upc_036000291452&seed=0&fmt=gs1qr&ecc=H&lax=1');
		vi.mocked(readCodesFile).mockResolvedValueOnce('x\r\ny');
		await setup.loadFile(file());
		expect(setup.rows).toEqual([
			{ payload: '036000291452', format: 'upc', ecc: '', lax: false },
			{ payload: 'x', format: 'gs1qr', ecc: '', lax: false },
			{ payload: 'y', format: 'gs1qr', ecc: '', lax: false }
		]);
	});

	it('reads the editor once the file is read', async () => {
		const setup = open('#codes=036000291452&seed=0');
		const read = deferred();
		const loading = setup.loadFile(file());
		setup.selectEditor('rows');
		read.resolve('a');
		await loading;
		expect(setup.rows.map((row) => row.payload)).toEqual(['036000291452', 'a']);
		expect(setup.text).toBe('036000291452');
	});

	it('sets the file error on a failed read and leaves the codes alone', async () => {
		const setup = open('#codes=036000291452&seed=0');
		vi.mocked(readCodesFile).mockRejectedValueOnce(new Error('boom'));
		await setup.loadFile(file());
		expect([setup.fileError, setup.text]).toEqual([ERROR, '036000291452']);
	});

	it('clears the file error when a load starts and when it succeeds', async () => {
		const setup = open('#codes=036000291452&seed=0');
		vi.mocked(readCodesFile).mockRejectedValueOnce(new Error('boom'));
		await setup.loadFile(file());
		expect(setup.fileError).toBe(ERROR);

		const failing = deferred();
		const again = setup.loadFile(file());
		expect(setup.fileError).toBe('');
		failing.reject(new Error('boom'));
		await again;
		expect(setup.fileError).toBe(ERROR);

		vi.mocked(readCodesFile).mockResolvedValueOnce('a');
		await setup.loadFile(file());
		expect([setup.fileError, setup.text]).toEqual(['', 'a']);
	});

	it('names duplicate neighbours by list position, or by editor row in Per row', () => {
		const list = open('#codes=a%0Ab%0Ab&seed=0&fmt=code128');
		expect(list.dupPairs).toEqual([[1, 2]]);
		expect(list.dupHint).toBe(
			"Codes 2 and 3 are identical. Many scanners skip a repeat read: set a gap of 1.00 s or more, or lower the scanner's reread delay."
		);

		const rows = open('#r1=qr_x&r2=qr_a&r3=qr_a&seed=0');
		rows.rows[0].payload = '';
		expect(rows.dupPairs).toEqual([[0, 1]]);
		expect(rows.dupHint).toMatch(/^Codes 2 and 3 are identical\. /);

		expect(open('#codes=a%0Ab&seed=0&fmt=code128').dupHint).toBe('');
	});

	// Canonical links, written out by hand with every key in appendSettings' order. Never build
	// them with encodeShareUrl: a link the encoder made proves nothing about the encoder.
	it.each([
		'#codes=hello+world%0Ax&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=7&fmt=qr&ecc=H',
		'#r1=upc_036000291452&r2=qr-H_hello&r3=gs1128-lax_%2801%2909501101530004&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc',
		'#codes=%2801%2909501101530004&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=gs1128&lax=1',
		'#codes=036000291452&speed=60&loop=1&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc&mode=step&dwell=500&gap=250',
		'#codes=036000291452&speed=120&loop=0&rot=1&rotmax=25&skew=1&skewmax=20&seed=999&fmt=upc'
	])('gives back the canonical link %s as its share link', (link) => {
		expect(open(link).shareHash).toBe(link);
	});
});
