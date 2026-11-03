import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SetupPage from './+page.svelte';
import { readCodesFile } from '$lib/fileInput';
import { encodeShareUrl } from '$lib/shareUrl';
import { DEFAULT_SETTINGS } from '$lib/types';

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

	it('renders the grouped format dropdown with 25 options', () => {
		const { container } = render(SetupPage);
		expect(container.querySelectorAll('.format-input optgroup').length).toBe(7);
		expect(container.querySelectorAll('.format-input option').length).toBe(25);
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
