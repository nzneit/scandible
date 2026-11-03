import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import SetupPage from './+page.svelte';
import { readCodesFile } from '$lib/fileInput';
import { encodeShareUrl } from '$lib/shareUrl';
import { DEFAULT_SETTINGS } from '$lib/types';
import { GS1_HINT, LAX_NOTE, SCAN_HINT } from '$lib/verdict';

const mockPage = vi.hoisted(() => ({ url: new URL('http://localhost/') }));
const goto = vi.hoisted(() => vi.fn());
vi.mock('$app/state', () => ({ page: mockPage }));
vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$app/paths', () => ({ resolve: (id: string) => id }));
vi.mock('$lib/fileInput', () => ({ readCodesFile: vi.fn() }));

const q = <T extends Element>(c: Element, sel: string) => c.querySelector(sel) as T;

beforeEach(() => {
	mockPage.url = new URL('http://localhost/');
	goto.mockReset();
});

describe('setup page', () => {
	it('prefills the textarea and settings from a legacy ?codes= URL', () => {
		mockPage.url = new URL('http://localhost/?codes=036000291452&speed=120&loop=1');
		const { container } = render(SetupPage);
		expect(q<HTMLTextAreaElement>(container, '.code-input').value).toBe('036000291452');
		expect(q<HTMLInputElement>(container, '.speed-input').value).toBe('120');
		expect(q<HTMLInputElement>(container, '.loop-input').checked).toBe(true);
	});

	it('prefills the textarea and settings from a #codes= fragment URL', () => {
		mockPage.url = new URL('http://localhost/#codes=036000291452&speed=120&loop=1');
		const { container } = render(SetupPage);
		expect(q<HTMLTextAreaElement>(container, '.code-input').value).toBe('036000291452');
		expect(q<HTMLInputElement>(container, '.speed-input').value).toBe('120');
		expect(q<HTMLInputElement>(container, '.loop-input').checked).toBe(true);
	});

	it('flags invalid entries and disables Start until there is a valid one', async () => {
		const { container } = render(SetupPage);
		const input = q<HTMLTextAreaElement>(container, '.code-input');
		const start = q<HTMLButtonElement>(container, '.start');
		expect(start.disabled).toBe(true);

		await fireEvent.input(input, { target: { value: 'bad' } });
		expect(container.querySelectorAll('.validation-list li').length).toBe(1);
		expect(container.querySelector('.validation-list li')?.classList.contains('invalid')).toBe(
			true
		);
		expect(start.disabled).toBe(true);

		await fireEvent.input(input, { target: { value: 'bad\n036000291452' } });
		expect(start.disabled).toBe(false);
	});

	it('navigates to /play with the full encoded state on Start', async () => {
		mockPage.url = new URL('http://localhost/?codes=036000291452&seed=0');
		const { container } = render(SetupPage);
		await fireEvent.click(q(container, '.start'));
		expect(goto).toHaveBeenCalledWith(
			'/play#codes=036000291452&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc'
		);
	});

	it('carries rotation, skew, and the seed into the Start URL', async () => {
		mockPage.url = new URL(
			'http://localhost/?codes=036000291452&rot=1&rotmax=25&skew=1&skewmax=20&seed=999'
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
			'http://localhost/?codes=036000291452&rot=0&rotmax=20&skew=0&skewmax=15&seed=77'
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
		const randomSpy = vi.spyOn(Math, 'random').mockReturnValueOnce(0.25).mockReturnValueOnce(0.75);
		try {
			mockPage.url = new URL('http://localhost/?codes=036000291452');
			const first = render(SetupPage);
			await fireEvent.click(q(first.container, '.copy-link'));
			const url1 = q<HTMLInputElement>(first.container, '.share-url').value;

			const second = render(SetupPage);
			await fireEvent.click(q(second.container, '.copy-link'));
			const url2 = q<HTMLInputElement>(second.container, '.share-url').value;

			expect(url1.match(/[?&]seed=(\d+)/)![1]).not.toBe(url2.match(/[?&]seed=(\d+)/)![1]);
		} finally {
			randomSpy.mockRestore();
		}
	});

	it('clears a rendered QR when the code list is edited afterwards', async () => {
		mockPage.url = new URL('http://localhost/?codes=036000291452');
		const { container } = render(SetupPage);
		await fireEvent.click(q(container, '.copy-link'));
		expect(q<HTMLElement>(container, '.qr-code').querySelector('svg')).not.toBeNull();
		await fireEvent.input(q(container, '.code-input'), { target: { value: '012345678905' } });
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

	it('clears a rendered QR when the format is switched afterwards', async () => {
		mockPage.url = new URL('http://localhost/?codes=036000291452');
		const { container } = render(SetupPage);
		await fireEvent.click(q(container, '.copy-link'));
		expect(q<HTMLElement>(container, '.qr-code').querySelector('svg')).not.toBeNull();
		await fireEvent.change(q(container, '.format-input'), { target: { value: 'code39' } });
		expect(q<HTMLElement>(container, '.qr-code').hidden).toBe(true);
	});

	it('loads codes from a file into the textarea', async () => {
		const { container } = render(SetupPage);
		vi.mocked(readCodesFile).mockResolvedValueOnce('036000291452\n012345678905');
		const fileInput = q<HTMLInputElement>(container, '.file-input');
		const file = new File(['x'], 'codes.txt', { type: 'text/plain' });
		Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
		await fireEvent.change(fileInput);
		await vi.waitFor(() =>
			expect(q<HTMLTextAreaElement>(container, '.code-input').value).toBe(
				'036000291452\n012345678905'
			)
		);
		expect(container.querySelectorAll('.validation-list li').length).toBe(2);
	});

	it('shows an inline file error and leaves the existing validation list untouched on read failure', async () => {
		mockPage.url = new URL('http://localhost/?codes=036000291452');
		const { container } = render(SetupPage);
		const originalCount = container.querySelectorAll('.validation-list li').length;
		const originalFirst = container.querySelector('.validation-list li')?.textContent;
		expect(originalCount).toBeGreaterThan(0);

		vi.mocked(readCodesFile).mockRejectedValueOnce(new Error('boom'));
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

	it('renders the grouped format dropdown with 36 options', () => {
		const { container } = render(SetupPage);
		expect(container.querySelectorAll('.format-input optgroup').length).toBe(8);
		expect(container.querySelectorAll('.format-input option').length).toBe(36);
		expect(q<HTMLSelectElement>(container, '.format-input').value).toBe('upc');
	});

	it('revalidates on format switch: HELLO flips invalid→valid and enables Start', async () => {
		const { container } = render(SetupPage);
		await fireEvent.input(q(container, '.code-input'), { target: { value: 'HELLO' } });
		expect(q<HTMLButtonElement>(container, '.start').disabled).toBe(true);
		await fireEvent.change(q(container, '.format-input'), { target: { value: 'code39' } });
		expect(container.querySelector('.validation-list li')?.classList.contains('valid')).toBe(true);
		expect(q<HTMLButtonElement>(container, '.start').disabled).toBe(false);
	});

	it('switches the placeholder between the numeric and text copy', async () => {
		const { container } = render(SetupPage);
		const input = q<HTMLTextAreaElement>(container, '.code-input');
		expect(input.placeholder).toBe('Paste codes — one per line, or comma-separated');
		await fireEvent.change(q(container, '.format-input'), { target: { value: 'code128' } });
		expect(input.placeholder).toBe('Paste codes — one per line');
	});

	it('shows exact arrow rows for encoder mutations, numeric and text', async () => {
		mockPage.url = new URL('http://localhost/?codes=590123412345&fmt=ean13');
		const { container } = render(SetupPage);
		expect(container.querySelector('.validation-list li')?.textContent).toBe(
			'590123412345 ✓ → 5901234123457'
		);
		await fireEvent.change(q(container, '.format-input'), { target: { value: 'code39' } });
		await fireEvent.input(q(container, '.code-input'), { target: { value: 'hello' } });
		expect(container.querySelector('.validation-list li')?.textContent).toBe('hello ✓ → HELLO');
	});

	it('shows no arrow for app-side whitespace stripping', async () => {
		const { container } = render(SetupPage);
		await fireEvent.input(q(container, '.code-input'), { target: { value: '0360 00291452' } });
		expect(container.querySelector('.validation-list li')?.textContent).toBe('0360 00291452 ✓');
	});

	it('carries a non-default format into the Start URL', async () => {
		mockPage.url = new URL('http://localhost/?codes=HELLO&fmt=code39&seed=0');
		const { container } = render(SetupPage);
		await fireEvent.click(q(container, '.start'));
		expect(goto.mock.calls[0][0]).toContain('fmt=code39');
	});
});

describe('setup page: error correction', () => {
	const X2000 = 'x'.repeat(2000);
	const setText = (c: Element, v: string) =>
		fireEvent.input(q(c, '.code-input'), { target: { value: v } });
	const choose = (c: Element, sel: string, v: string) =>
		fireEvent.change(q(c, sel), { target: { value: v } });
	const setFormat = (c: Element, v: string) => choose(c, '.format-input', v);
	const setEcc = (c: Element, v: string) => choose(c, '.ecc-input', v);
	const firstRow = (c: Element) => c.querySelector('.validation-list li')?.textContent;

	it('validates hello world as qr with the facts row and shows the field at the default level', async () => {
		const { container } = render(SetupPage);
		await setText(container, 'hello world');
		await setFormat(container, 'qr');
		expect(firstRow(container)).toBe('hello world ✓ · 21×21 modules · 11 bytes');
		const select = q<HTMLSelectElement>(container, '.ecc-input');
		expect(select.value).toBe('M');
		expect(select.selectedOptions[0].textContent).toBe('level M (~15% recovery, default)');
		expect(q(container, '.ecc-field').textContent?.startsWith('Error correction')).toBe(true);
		const input = q<HTMLTextAreaElement>(container, '.code-input');
		expect(input.placeholder).toBe('Paste codes — one per line');
	});

	it('renders no field for upc or datamatrix', async () => {
		const { container } = render(SetupPage);
		expect(container.querySelector('.ecc-input')).toBeNull();
		await setFormat(container, 'datamatrix');
		expect(container.querySelector('.ecc-input')).toBeNull();
	});

	it('applies the chosen level to validation and returns to the default', async () => {
		const { container } = render(SetupPage);
		await setText(container, X2000);
		await setFormat(container, 'qr');
		expect(firstRow(container)).toBe(`${X2000} ✓ · 169×169 modules · 2000 bytes · dense`);
		await setEcc(container, 'H');
		expect(firstRow(container)).toBe(`${X2000} ✗ too long for QR Code (level H)`);
		await setEcc(container, 'M');
		expect(q<HTMLSelectElement>(container, '.ecc-input').value).toBe('M');
		expect(firstRow(container)).toBe(`${X2000} ✓ · 169×169 modules · 2000 bytes · dense`);
	});

	it('resets to the new format’s default when switching from qr at H to aztec', async () => {
		const { container } = render(SetupPage);
		await setText(container, 'hello world');
		await setFormat(container, 'qr');
		await setEcc(container, 'H');
		await setFormat(container, 'aztec');
		const select = q<HTMLSelectElement>(container, '.ecc-input');
		expect(select.value).toBe('23');
		expect(select.selectedOptions[0].textContent).toBe('≥23% error correction (default)');
		expect(firstRow(container)).toBe('hello world ✓ · 19×19 modules · 11 bytes');
	});
});

describe('setup page: fragment URLs and ecc in the Start URL', () => {
	const setEcc = (c: Element, v: string) =>
		fireEvent.change(q(c, '.ecc-input'), { target: { value: v } });

	it('ends the Start URL with &fmt=qr&ecc=H for qr at level H', async () => {
		mockPage.url = new URL('http://localhost/#codes=hello%20world&seed=0&fmt=qr&ecc=H');
		const { container } = render(SetupPage);
		await fireEvent.click(q(container, '.start'));
		expect(goto).toHaveBeenCalledWith(
			'/play#codes=hello+world&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=qr&ecc=H'
		);
	});

	it('drops ecc from the Start URL after choosing level H then level M', async () => {
		mockPage.url = new URL('http://localhost/#codes=hello%20world&seed=0&fmt=qr');
		const { container } = render(SetupPage);
		await setEcc(container, 'H');
		await fireEvent.click(q(container, '.start'));
		await setEcc(container, 'M');
		await fireEvent.click(q(container, '.start'));
		expect(goto.mock.calls[0][0]).toMatch(/&fmt=qr&ecc=H$/);
		expect(goto.mock.calls[1][0]).toMatch(/&fmt=qr$/);
	});

	it('emits no ecc after switching from qr at H to aztec', async () => {
		mockPage.url = new URL('http://localhost/#codes=hello%20world&seed=0&fmt=qr&ecc=H');
		const { container } = render(SetupPage);
		await fireEvent.change(q(container, '.format-input'), { target: { value: 'aztec' } });
		await fireEvent.click(q(container, '.start'));
		expect(goto.mock.calls[0][0]).toMatch(/^\/play#codes=hello\+world&/);
		expect(goto.mock.calls[0][0]).toMatch(/&fmt=aztec$/);
	});

	it('carries a payload with # & % + , and spaces into the Start URL unchanged', async () => {
		const codes = ['a#b&c%d+e,f g'];
		const s = { ...DEFAULT_SETTINGS, format: 'code128' as const, seed: 7 };
		mockPage.url = new URL('http://localhost/' + encodeShareUrl(codes, s));
		const { container } = render(SetupPage);
		expect(q<HTMLTextAreaElement>(container, '.code-input').value).toBe('a#b&c%d+e,f g');
		await fireEvent.click(q(container, '.start'));
		expect(goto.mock.calls[0][0]).toMatch(/^\/play#codes=/);
		expect(goto).toHaveBeenCalledWith('/play' + encodeShareUrl(codes, s));
	});

	it('reloads on hashchange, and not after unmount', () => {
		const reload = vi.fn();
		const { origin, pathname } = location;
		vi.stubGlobal('location', { origin, pathname, reload });
		try {
			const { unmount } = render(SetupPage);
			window.dispatchEvent(new Event('hashchange'));
			expect(reload).toHaveBeenCalledTimes(1);
			unmount();
			window.dispatchEvent(new Event('hashchange'));
			expect(reload).toHaveBeenCalledTimes(1);
		} finally {
			vi.unstubAllGlobals();
		}
	});
});

describe('setup page: step playback', () => {
	let c: HTMLElement;
	const open = (url = 'http://localhost/?codes=036000291452&seed=0') => {
		mockPage.url = new URL(url);
		c = render(SetupPage).container;
	};
	const has = (sel: string) => c.querySelector(sel) !== null;
	const v = (sel: string) => q<HTMLInputElement>(c, sel).value;
	const set = (sel: string, value: string) => fireEvent.change(q(c, sel), { target: { value } });
	const slide = (sel: string, value: string) => fireEvent.input(q(c, sel), { target: { value } });
	const start = async () => {
		await fireEvent.click(q(c, '.start'));
		return goto.mock.calls.at(-1)?.[0];
	};

	it('offers Scroll and Step after Error correction and before Speed, showing scroll', () => {
		open('http://localhost/#codes=hello&fmt=qr');
		const opts = [...q<HTMLSelectElement>(c, '.mode-input').options].map((o) => [o.value, o.text]);
		expect(opts).toEqual([
			['scroll', 'Scroll'],
			['step', 'Step']
		]);
		expect(v('.mode-input')).toBe('scroll');
		const follows = (a: string, b: string) =>
			q(c, a).compareDocumentPosition(q(c, b)) & Node.DOCUMENT_POSITION_FOLLOWING;
		expect(follows('.ecc-input', '.mode-input')).toBeTruthy();
		expect(follows('.mode-input', '.speed-input')).toBeTruthy();
	});

	it('replaces Speed with Dwell and Gap in Step, with their ranges and seconds fields', async () => {
		open();
		await set('.mode-input', 'step');
		expect(has('.speed-input')).toBe(false);
		const dwell = q(c, '.dwell-input');
		expect(dwell.getAttribute('min')).toBe('50');
		expect(dwell.getAttribute('max')).toBe('5000');
		expect(dwell.getAttribute('step')).toBe('10');
		expect(dwell.getAttribute('aria-valuetext')).toBe('1.00 s');
		const gap = q(c, '.gap-input');
		expect(gap.getAttribute('min')).toBe('0');
		expect(gap.getAttribute('max')).toBe('2000');
		expect(gap.getAttribute('step')).toBe('10');
		expect(gap.getAttribute('aria-valuetext')).toBe('0.00 s');
		expect(v('.dwell-seconds')).toBe('1.00');
		expect(v('.gap-seconds')).toBe('0.00');
		await slide('.dwell-input', '500');
		expect(v('.dwell-seconds')).toBe('0.50');
	});

	it('takes typed seconds snapped and clamped, and shows the value again when unchanged', async () => {
		open();
		await set('.mode-input', 'step');
		await set('.dwell-seconds', '1');
		expect(v('.dwell-input')).toBe('1000');
		expect(v('.dwell-seconds')).toBe('1.00');
		await set('.dwell-seconds', '0.4');
		expect(v('.dwell-input')).toBe('400');
		expect(v('.dwell-seconds')).toBe('0.40');
		expect(await start()).toContain('&mode=step&dwell=400');
		await set('.dwell-seconds', '9');
		expect(v('.dwell-input')).toBe('5000');
		expect(v('.dwell-seconds')).toBe('5.00');
		await set('.dwell-seconds', 'abc');
		expect(v('.dwell-input')).toBe('5000');
		expect(v('.dwell-seconds')).toBe('5.00');
		await set('.gap-seconds', '2.5');
		expect(v('.gap-input')).toBe('2000');
		expect(v('.gap-seconds')).toBe('2.00');
	});

	it('shows the flashing note for a dwell under 330 ms only', async () => {
		open();
		await set('.mode-input', 'step');
		await slide('.dwell-input', '300');
		expect(has('.flash-note')).toBe(true);
		await slide('.dwell-input', '330');
		expect(has('.flash-note')).toBe(false);
	});

	it('names identical neighbours under Gap while the gap is under 1.00 s, in Step only', async () => {
		open('http://localhost/#codes=a%0Ab%0Ab&fmt=code128');
		expect(has('.dup-hint')).toBe(false);
		await set('.mode-input', 'step');
		expect(q(c, '.dup-hint').textContent).toBe(
			"Codes 2 and 3 are identical. Many scanners skip a repeat read: set a gap of 1.00 s or more, or lower the scanner's reread delay."
		);
		await fireEvent.input(q(c, '.code-input'), { target: { value: 'a\na\nb\nb' } });
		expect(q(c, '.dup-hint').textContent).toMatch(
			/^Codes 1 and 2 are identical, and 1 more neighboring pair\./
		);
		await slide('.gap-input', '1000');
		expect(has('.dup-hint')).toBe(false);
		await slide('.gap-input', '990');
		expect(has('.dup-hint')).toBe(true);
		await set('.mode-input', 'scroll');
		expect(has('.dup-hint')).toBe(false);
	});

	it('keeps a hidden dwell and a hidden speed across mode switches', async () => {
		open();
		await set('.mode-input', 'step');
		await slide('.dwell-input', '500');
		await set('.mode-input', 'scroll');
		await slide('.speed-input', '120');
		await set('.mode-input', 'step');
		expect(v('.dwell-input')).toBe('500');
		await set('.mode-input', 'scroll');
		expect(v('.speed-input')).toBe('120');
	});

	it('carries mode, dwell and gap into the Start URL in order', async () => {
		open();
		await set('.mode-input', 'step');
		expect(await start()).toMatch(/&fmt=upc&mode=step$/);
		await slide('.dwell-input', '500');
		await slide('.gap-input', '250');
		expect(await start()).toBe(
			'/play#codes=036000291452&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc&mode=step&dwell=500&gap=250'
		);
	});

	it('prefills Step and the dwell from a step link', () => {
		open('http://localhost/#codes=036000291452&mode=step&dwell=500');
		expect(v('.mode-input')).toBe('step');
		expect(v('.dwell-input')).toBe('500');
		expect(v('.dwell-seconds')).toBe('0.50');
	});
});

describe('setup page: per-row editor', () => {
	const DECK = 'http://localhost/#r1=upc_036000291452&r2=qr-H_hello&seed=0';
	const MIXED =
		'http://localhost/#r1=upc_036000291452&r2=qr-H_hello&r3=datamatrix_line+1%0Aline+2&seed=0';
	const EMPTY = '#codes=&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc';
	const LIMIT =
		'Plain text keeps one format and one error-correction level for the whole list, and one code per line.';
	let c: HTMLElement;
	const open = (url = 'http://localhost/?codes=036000291452&seed=0') => {
		mockPage.url = new URL(url);
		c = render(SetupPage).container;
	};
	const has = (sel: string) => c.querySelector(sel) !== null;
	const v = (sel: string) => q<HTMLInputElement>(c, sel).value;
	const at = (k: number, sel: string) =>
		c.querySelectorAll('li.row')[k - 1].querySelector(sel) as HTMLInputElement;
	const values = (sel: string) =>
		[...c.querySelectorAll<HTMLInputElement>(sel)].map((el) => el.value);
	const rowCount = () => c.querySelectorAll('li.row').length;
	const set = (el: Element, value: string) => fireEvent.change(el, { target: { value } });
	const editor = (value: string) => set(q(c, '.editor-input'), value);
	const note = () => q(c, '.switch-note p').textContent;
	/** The Format field's label: its first text node, trimmed. */
	const formatLabel = () => q(c, '.format-input').parentElement!.firstChild!.textContent!.trim();
	const start = async () => {
		await fireEvent.click(q(c, '.start'));
		return goto.mock.calls.at(-1)?.[0];
	};
	/** Mock one readCodesFile call to resolve to `text`, or reject when it is null, then pick a
	 *  file in .file-input. */
	const upload = async (text: string | null) => {
		if (text === null) vi.mocked(readCodesFile).mockRejectedValueOnce(new Error('boom'));
		else vi.mocked(readCodesFile).mockResolvedValueOnce(text);
		const fileInput = q<HTMLInputElement>(c, '.file-input');
		const file = new File(['x'], 'codes.txt', { type: 'text/plain' });
		Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
		await fireEvent.change(fileInput);
	};
	const share = () => v('.share-url');
	const lossy = async () => {
		open(MIXED);
		await editor('text');
	};

	it('opens in Plain text by default', () => {
		open();
		expect(v('.editor-input')).toBe('text');
		expect(has('.code-input')).toBe(true);
		expect(has('.row-editor')).toBe(false);
	});

	it('opens a records link in Per row with its rows', () => {
		open(DECK);
		expect(v('.editor-input')).toBe('rows');
		expect(has('.code-input')).toBe(false);
		expect(has('.validation-list')).toBe(false);
		expect(values('.row-payload')).toEqual(['036000291452', 'hello']);
		expect(values('.row-format')).toEqual(['upc', 'qr']);
		expect(at(2, '.row-ecc').value).toBe('H');
	});

	it('shows the Editor hint in Plain text only', async () => {
		open();
		expect(q(c, '.editor-hint').textContent).toBe(
			'Per row gives each code its own format, error-correction level and GS1 validation setting, and lets a code span several lines.'
		);
		await editor('rows');
		expect(has('.editor-hint')).toBe(false);
	});

	it('turns the list into one row per code at the list format', async () => {
		open('http://localhost/#codes=036000291452%2C012345678905&seed=0');
		await editor('rows');
		expect(values('.row-payload')).toEqual(['036000291452', '012345678905']);
		expect(values('.row-format')).toEqual(['upc', 'upc']);
	});

	it('copies the list level into the rows and swaps the list controls', async () => {
		open('http://localhost/#codes=hello%0Aworld&seed=0&fmt=qr&ecc=H');
		expect(formatLabel()).toBe('Format');
		await editor('rows');
		expect(values('.row-format')).toEqual(['qr', 'qr']);
		expect(at(1, '.row-ecc').value).toBe('H');
		expect(at(2, '.row-ecc').value).toBe('H');
		expect(has('.ecc-input')).toBe(false);
		expect(formatLabel()).toBe('Format for new rows');
	});

	it('switches back at once when nothing is lost', async () => {
		open('http://localhost/#codes=hello%0Aworld&seed=0&fmt=qr&ecc=H');
		await editor('rows');
		await editor('text');
		expect(v('.code-input')).toBe('hello\nworld');
		expect(v('.format-input')).toBe('qr');
		expect(v('.ecc-input')).toBe('H');
		expect(v('.editor-input')).toBe('text');
		expect(has('.switch-note')).toBe(false);
	});

	it('opens an empty codes= link in Plain text with its settings', () => {
		open('http://localhost/#codes=&speed=120&seed=0&fmt=qr');
		expect(v('.editor-input')).toBe('text');
		expect(v('.code-input')).toBe('');
		expect(v('.format-input')).toBe('qr');
		expect(v('.speed-input')).toBe('120');
	});

	it('shows the loss note on a lossy switch and stays in Per row', async () => {
		await lossy();
		expect(q(c, '.switch-note').getAttribute('role')).toBe('alert');
		expect(note()).toBe(
			`${LIMIT} Switching now drops the format of 2 rows and cuts 1 payload at line breaks or commas. Every code will take the format of the first code, UPC-A.`
		);
		expect(v('.editor-input')).toBe('rows');
		expect(rowCount()).toBe(3);
	});

	it('keeps the note as a snapshot, and Switch anyway applies a list now lossless', async () => {
		await lossy();
		const before = note();
		await fireEvent.click(at(3, '.row-delete'));
		await fireEvent.click(at(2, '.row-delete'));
		expect(note()).toBe(before);
		await fireEvent.click(q(c, '.switch-anyway'));
		expect(v('.code-input')).toBe('036000291452');
		expect(v('.editor-input')).toBe('text');
	});

	it('refreshes a stale note on Switch anyway, and switches on the second click', async () => {
		await lossy();
		const before = note();
		await set(at(2, '.row-format'), 'upc');
		expect(note()).toBe(before);
		await fireEvent.click(q(c, '.switch-anyway'));
		expect(note()).toBe(
			`${LIMIT} Switching now drops the format of 1 row and cuts 1 payload at line breaks or commas. Every code will take the format of the first code, UPC-A.`
		);
		expect(v('.editor-input')).toBe('rows');
		expect(rowCount()).toBe(3);
		await fireEvent.click(q(c, '.switch-anyway'));
		expect(v('.editor-input')).toBe('text');
	});

	it('takes a fresh snapshot when Plain text is chosen again', async () => {
		await lossy();
		await fireEvent.click(at(3, '.row-delete'));
		await editor('text');
		expect(note()).toBe(
			`${LIMIT} Switching now drops the format of 1 row. Every code will take the format of the first code, UPC-A.`
		);
	});

	it("applies the first code's format on Switch anyway and returns focus to the Editor select", async () => {
		await lossy();
		await fireEvent.click(q(c, '.switch-anyway'));
		expect(v('.code-input')).toBe('036000291452\nhello\nline 1\nline 2');
		expect(v('.format-input')).toBe('upc');
		expect(v('.editor-input')).toBe('text');
		expect(has('.switch-note')).toBe(false);
		expect(c.querySelectorAll('.validation-list li').length).toBe(4);
		await tick();
		expect(document.activeElement).toBe(q(c, '.editor-input'));
	});

	it('closes the note on Cancel, keeping the rows and returning focus', async () => {
		await lossy();
		await fireEvent.click(q(c, '.switch-cancel'));
		expect(has('.switch-note')).toBe(false);
		expect(v('.editor-input')).toBe('rows');
		expect(rowCount()).toBe(3);
		await tick();
		expect(document.activeElement).toBe(q(c, '.editor-input'));
	});

	it("carries records in the share link and Start, storing a default level as ''", async () => {
		open(DECK);
		expect(share()).toContain('#r1=upc_036000291452&r2=qr-H_hello&speed=60');
		expect(share()).not.toContain('codes=');
		expect(await start()).toBe(
			'/play#r1=upc_036000291452&r2=qr-H_hello&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc'
		);
		await set(at(2, '.row-ecc'), 'M');
		expect(share()).toContain('r2=qr_hello&');
	});

	it('gives Add code the Format for new rows', async () => {
		open(DECK);
		await set(q(c, '.format-input'), 'datamatrix');
		await fireEvent.click(q(c, '.row-add'));
		expect(at(3, '.row-format').value).toBe('datamatrix');
	});

	it('appends an uploaded file as rows in Per row', async () => {
		open('http://localhost/#r1=upc_036000291452&r2=qr-H_hello&fmt=qr&ecc=H&seed=0');
		await upload('a\nb');
		await vi.waitFor(() => {
			expect(rowCount()).toBe(4);
			expect(values('.row-payload')).toEqual(['036000291452', 'hello', 'a', 'b']);
			expect(values('.row-format')).toEqual(['upc', 'qr', 'qr', 'qr']);
			expect(at(2, '.row-ecc').value).toBe('H');
			expect(at(3, '.row-ecc').value).toBe('M');
			expect(at(4, '.row-ecc').value).toBe('M');
		});
	});

	it('appends a CRLF file as rows with no CR left', async () => {
		open(DECK);
		await upload('a\r\nb\r\n');
		await vi.waitFor(() => {
			expect(rowCount()).toBe(4);
			expect(values('.row-payload')).toEqual(['036000291452', 'hello', 'a', 'b']);
		});
	});

	it('clears the file error in Per row on a good read or a switch', async () => {
		open();
		await upload(null);
		await vi.waitFor(() => expect(q<HTMLElement>(c, '.file-error').hidden).toBe(false));
		await editor('rows');
		expect(q<HTMLElement>(c, '.file-error').hidden).toBe(true);
		open('http://localhost/#r1=upc_036000291452&seed=0');
		await upload(null);
		await vi.waitFor(() => {
			expect(q<HTMLElement>(c, '.file-error').hidden).toBe(false);
			expect(q(c, '.file-error').textContent).toBe('Could not read file');
		});
		await upload('c');
		await vi.waitFor(() => {
			expect(rowCount()).toBe(2);
			expect(q<HTMLElement>(c, '.file-error').hidden).toBe(true);
		});
		await upload(null);
		await vi.waitFor(() => expect(q<HTMLElement>(c, '.file-error').hidden).toBe(false));
		await editor('text');
		expect(v('.editor-input')).toBe('text');
		expect(q<HTMLElement>(c, '.file-error').hidden).toBe(true);
		open(MIXED);
		await upload(null);
		await vi.waitFor(() => expect(q<HTMLElement>(c, '.file-error').hidden).toBe(false));
		await editor('text');
		expect(q<HTMLElement>(c, '.file-error').hidden).toBe(true);
		await upload(null);
		await vi.waitFor(() => expect(q<HTMLElement>(c, '.file-error').hidden).toBe(false));
		await fireEvent.click(q(c, '.switch-anyway'));
		expect(q<HTMLElement>(c, '.file-error').hidden).toBe(true);
	});

	it('names editor rows in the duplicate hint', async () => {
		open('http://localhost/#r1=qr_x&r2=qr_a&r3=qr_a&mode=step&seed=0');
		await fireEvent.input(at(1, '.row-payload'), { target: { value: '' } });
		expect(q(c, '.dup-hint').textContent).toMatch(/^Codes 2 and 3 are identical/);
	});

	it('switches an empty list to no rows, and a blank row changes neither Start nor the link', async () => {
		open('http://localhost/#codes=&seed=0');
		await editor('rows');
		expect(rowCount()).toBe(0);
		expect(q<HTMLButtonElement>(c, '.start').disabled).toBe(true);
		expect(share().endsWith(EMPTY)).toBe(true);
		await fireEvent.click(q(c, '.row-add'));
		expect(rowCount()).toBe(1);
		expect(q<HTMLButtonElement>(c, '.start').disabled).toBe(true);
		expect(share().endsWith(EMPTY)).toBe(true);
	});

	it("keeps each record's format on a link without fmt, and Start writes fmt=upc", async () => {
		open('http://localhost/#r1=qr_x&r2=datamatrix_y&seed=0');
		expect(values('.row-format')).toEqual(['qr', 'datamatrix']);
		expect(v('.format-input')).toBe('upc');
		expect(formatLabel()).toBe('Format for new rows');
		expect(await start()).toBe(
			'/play#r1=qr_x&r2=datamatrix_y&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc'
		);
	});

	it('writes no record for a blank new row, and its record once typed', async () => {
		open(DECK);
		await set(q(c, '.format-input'), 'qr');
		const before = share();
		await fireEvent.click(q(c, '.row-add'));
		expect(at(3, '.row-ecc').value).toBe('M');
		expect(share()).toBe(before);
		await fireEvent.input(at(3, '.row-payload'), { target: { value: 'x' } });
		expect(share()).toContain('&r2=qr-H_hello&r3=qr_x&speed=60&');
		expect(share().endsWith('&fmt=qr')).toBe(true);
	});

	it('empties the deck on the last Delete, focusing Add code', async () => {
		open(DECK);
		await fireEvent.click(at(1, '.row-delete'));
		await fireEvent.click(at(1, '.row-delete'));
		await tick();
		expect(document.activeElement).toBe(q(c, '.row-add'));
		expect(rowCount()).toBe(0);
		expect(q<HTMLButtonElement>(c, '.start').disabled).toBe(true);
		expect(share().endsWith(EMPTY)).toBe(true);
	});
});

describe('setup page: GS1 validation setting', () => {
	const S = '(01)09501101530003(17)261231(10)LOT42';
	const BAD = '(01)09501101530004';
	const GS1_LIMIT =
		'Plain text keeps one format, one error-correction level and one render-if-invalid setting for the whole list, and one code per line.';
	const list = (payload: string, tail = '') =>
		`http://localhost/#codes=${encodeURIComponent(payload)}&seed=0&fmt=gs1128${tail}`;
	let c: HTMLElement;
	const open = (url: string) => {
		mockPage.url = new URL(url);
		c = render(SetupPage).container;
	};
	const has = (sel: string) => c.querySelector(sel) !== null;
	const box = () => q<HTMLInputElement>(c, '.lax-input');
	const set = (sel: string, value: string) => fireEvent.change(q(c, sel), { target: { value } });
	const share = () => q<HTMLInputElement>(c, '.share-url').value;
	const rowBoxes = () =>
		[...c.querySelectorAll<HTMLInputElement>('.row-lax-input')].map((el) => el.checked);
	/** Whether the element at `a` precedes the one at `b` in the document. */
	const precedes = (a: string, b: string) =>
		Boolean(q(c, a).compareDocumentPosition(q(c, b)) & Node.DOCUMENT_POSITION_FOLLOWING);

	it('shows the box, its note, the GS1 hint and the GS1 placeholder for a GS1 list, after the level select', async () => {
		open(list(S));
		expect(box().checked).toBe(false);
		expect(
			q(c, '.lax-field').textContent?.trim().startsWith('Render GS1 data that fails validation')
		).toBe(true);
		expect(q(c, '.lax-note').textContent).toBe(LAX_NOTE);
		expect(box().getAttribute('aria-describedby')).toBe(q(c, '.lax-note').id);
		expect(q(c, '.gs1-hint').textContent).toBe(GS1_HINT);
		expect(q<HTMLTextAreaElement>(c, '.code-input').placeholder).toBe(
			'Paste GS1 element strings — one per line'
		);
		expect(precedes('.format-input', '.lax-input') && precedes('.lax-input', '.mode-input')).toBe(
			true
		);
		await set('.format-input', 'gs1qr');
		expect(precedes('.ecc-input', '.lax-input') && precedes('.lax-input', '.mode-input')).toBe(
			true
		);
		await set('.format-input', 'upc');
		expect([has('.lax-input'), has('.lax-note'), has('.gs1-hint')]).toEqual([false, false, false]);
		expect(q<HTMLTextAreaElement>(c, '.code-input').placeholder).toBe(
			'Paste codes — one per line, or comma-separated'
		);
	});

	it('prefills the box from lax=1, flags the row amber with the scan hint, and clears when the format leaves GS1', async () => {
		open(list(BAD, '&lax=1'));
		expect(box().checked).toBe(true);
		expect(q(c, '.validation-list li').classList.contains('lenient')).toBe(true);
		expect(q(c, '.scan-hint').textContent).toBe(SCAN_HINT);
		expect(share()).toContain('&fmt=gs1128&lax=1');
		expect(q<HTMLButtonElement>(c, '.start').disabled).toBe(false);
		await set('.format-input', 'upc');
		await set('.format-input', 'gs1128');
		expect(box().checked).toBe(false);
		expect(share()).not.toContain('lax=');
		expect(q(c, '.validation-list li').classList.contains('invalid')).toBe(true);
		expect(q<HTMLButtonElement>(c, '.start').disabled).toBe(true);
	});

	it('ticks the box, validates leniently and writes lax=1 at the end of the link', async () => {
		open(list(BAD));
		expect(q(c, '.validation-list li').classList.contains('invalid')).toBe(true);
		await fireEvent.click(box());
		expect(q(c, '.validation-list li').classList.contains('lenient')).toBe(true);
		expect(share()).toMatch(/&fmt=gs1128&lax=1$/);
	});

	it('carries the box into Per row rows and back, hiding the page box in Per row', async () => {
		open(list(`${BAD}\n${S}`, '&lax=1'));
		await set('.editor-input', 'rows');
		expect(has('.lax-field')).toBe(false);
		expect(rowBoxes()).toEqual([true, true]);
		expect(c.querySelectorAll('.lax-note').length).toBe(1); // the row editor's
		expect(c.querySelectorAll('.gs1-hint').length).toBe(1);
		await set('.editor-input', 'text');
		expect(has('.switch-note')).toBe(false);
		expect(box().checked).toBe(true);
		expect(share()).toContain('&fmt=gs1128&lax=1');
	});

	it('words the render-if-invalid loss on a mixed switch', async () => {
		open(
			`http://localhost/#r1=gs1128_${encodeURIComponent(S)}&r2=gs1128-lax_${encodeURIComponent(S)}&seed=0`
		);
		await set('.editor-input', 'text');
		expect(q(c, '.switch-note p').textContent).toBe(
			`${GS1_LIMIT} Switching now drops the render-if-invalid setting of 1 row. Every code will take the format of the first code, GS1-128, with invalid GS1 data skipped.`
		);
	});

	it('appends uploaded rows with the box off', async () => {
		open(`http://localhost/#r1=gs1128-lax_${encodeURIComponent(BAD)}&fmt=gs1128&lax=1&seed=0`);
		vi.mocked(readCodesFile).mockResolvedValueOnce(S);
		const fileInput = q<HTMLInputElement>(c, '.file-input');
		Object.defineProperty(fileInput, 'files', {
			value: [new File(['x'], 'codes.txt', { type: 'text/plain' })],
			configurable: true
		});
		await fireEvent.change(fileInput);
		await tick();
		expect(rowBoxes()).toEqual([true, false]);
	});
});
