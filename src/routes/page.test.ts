import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen, within } from '@testing-library/svelte';
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

const EDITOR_HINT =
	'Per row gives each code its own format, error-correction level and GS1 validation setting, and lets a code span several lines.';
const FLASH_NOTE =
	'Dwells under 0.33 s flash the screen more than three times a second. Do not use them near anyone sensitive to flashing lights.';
const DUP_HINT = /^Codes \d+ and \d+ are identical/; // Questions 3: the duplicate hint, whose text varies
/** The raw textContent of the element in `scope` whose trimmed text is `text`. */
const exactText = (scope: HTMLElement, text: string) =>
	within(scope).getByText(text.trim()).textContent; // R3
/** The validation list's items. */
const items = () =>
	within(screen.getByRole('list', { name: 'Validation results' })).getAllByRole('listitem');

beforeEach(() => {
	mockPage.url = new URL('http://localhost/');
	goto.mockReset();
});

describe('setup page', () => {
	it('prefills the textarea and settings from a legacy ?codes= URL', () => {
		mockPage.url = new URL('http://localhost/?codes=036000291452&speed=120&loop=1');
		render(SetupPage);
		expect(screen.getByRole('textbox', { name: 'Codes' })).toHaveValue('036000291452');
		expect(screen.getByRole('slider', { name: 'Speed' })).toHaveValue('120');
		expect(screen.getByRole('checkbox', { name: 'Loop' })).toBeChecked();
	});

	it('prefills the textarea and settings from a #codes= fragment URL', () => {
		mockPage.url = new URL('http://localhost/#codes=036000291452&speed=120&loop=1');
		render(SetupPage);
		expect(screen.getByRole('textbox', { name: 'Codes' })).toHaveValue('036000291452');
		expect(screen.getByRole('slider', { name: 'Speed' })).toHaveValue('120');
		expect(screen.getByRole('checkbox', { name: 'Loop' })).toBeChecked();
	});

	it('flags invalid entries and disables Start until there is a valid one', async () => {
		render(SetupPage);
		const input = screen.getByRole('textbox', { name: 'Codes' });
		const start = screen.getByRole('button', { name: 'Start' });
		expect(start).toBeDisabled();

		await fireEvent.input(input, { target: { value: 'bad' } });
		expect(items()).toHaveLength(1);
		expect(exactText(items()[0], ' ✗ invalid')).toBe(' ✗ invalid');
		expect(start).toBeDisabled();

		await fireEvent.input(input, { target: { value: 'bad\n036000291452' } });
		expect(start).toBeEnabled();
	});

	it('navigates to /play with the full encoded state on Start', async () => {
		mockPage.url = new URL('http://localhost/?codes=036000291452&seed=0');
		render(SetupPage);
		await fireEvent.click(screen.getByRole('button', { name: 'Start' }));
		expect(goto).toHaveBeenCalledWith(
			'/play#codes=036000291452&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc'
		);
	});

	it('carries rotation, skew, and the seed into the Start URL', async () => {
		mockPage.url = new URL(
			'http://localhost/?codes=036000291452&rot=1&rotmax=25&skew=1&skewmax=20&seed=999'
		);
		render(SetupPage);
		await fireEvent.click(screen.getByRole('button', { name: 'Start' }));
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
		render(SetupPage);
		expect(screen.getByRole('checkbox', { name: 'Random rotation' })).not.toBeChecked();
		expect(screen.getByRole('slider', { name: 'Maximum rotation' })).toHaveValue('20');
		expect(screen.getByRole('slider', { name: 'Maximum rotation' })).toBeDisabled();
		expect(screen.getByRole('checkbox', { name: 'Random skew' })).not.toBeChecked();
		expect(screen.getByRole('slider', { name: 'Maximum skew' })).toHaveValue('15');
		expect(screen.getByRole('slider', { name: 'Maximum skew' })).toBeDisabled();
	});

	it('enables the rotation slider when its checkbox is checked', async () => {
		mockPage.url = new URL('http://localhost/?codes=036000291452');
		render(SetupPage);
		const cb = screen.getByRole('checkbox', { name: 'Random rotation' });
		const slider = screen.getByRole('slider', { name: 'Maximum rotation' });
		expect(slider).toBeDisabled();
		await fireEvent.click(cb);
		expect(slider).toBeEnabled();
	});

	it('builds a share URL into the Share link field via ShareLink', async () => {
		mockPage.url = new URL('http://localhost/?codes=036000291452');
		render(SetupPage);
		await fireEvent.click(screen.getByRole('button', { name: 'Share link' }));
		expect(
			(screen.getByRole('textbox', { name: 'Share link' }) as HTMLInputElement).value
		).toContain('codes=036000291452');
	});

	it('preserves a URL-provided seed in the share URL', async () => {
		mockPage.url = new URL('http://localhost/?codes=036000291452&skew=1&seed=424242');
		render(SetupPage);
		await fireEvent.click(screen.getByRole('button', { name: 'Share link' }));
		expect(
			(screen.getByRole('textbox', { name: 'Share link' }) as HTMLInputElement).value
		).toContain('seed=424242');
	});

	it('generates a session seed from Math.random when the URL has none', async () => {
		const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.42);
		try {
			mockPage.url = new URL('http://localhost/?codes=036000291452');
			render(SetupPage);
			await fireEvent.click(screen.getByRole('button', { name: 'Share link' }));
			const url = (screen.getByRole('textbox', { name: 'Share link' }) as HTMLInputElement).value;
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
			const { container: first } = render(SetupPage);
			await fireEvent.click(within(first).getByRole('button', { name: 'Share link' }));
			const url1 = (within(first).getByRole('textbox', { name: 'Share link' }) as HTMLInputElement)
				.value;

			const { container: second } = render(SetupPage);
			await fireEvent.click(within(second).getByRole('button', { name: 'Share link' }));
			const url2 = (within(second).getByRole('textbox', { name: 'Share link' }) as HTMLInputElement)
				.value;

			expect(url1.match(/[?&]seed=(\d+)/)![1]).not.toBe(url2.match(/[?&]seed=(\d+)/)![1]);
		} finally {
			randomSpy.mockRestore();
		}
	});

	it('clears a rendered QR when the code list is edited afterwards', async () => {
		mockPage.url = new URL('http://localhost/?codes=036000291452');
		render(SetupPage);
		await fireEvent.click(screen.getByRole('button', { name: 'Share link' }));
		expect(screen.getByLabelText('QR code for the share link')).not.toBeEmptyDOMElement();
		await fireEvent.input(screen.getByRole('textbox', { name: 'Codes' }), {
			target: { value: '012345678905' }
		});
		const qr = screen.getByLabelText('QR code for the share link');
		expect(qr).not.toBeVisible();
		expect(qr).toBeEmptyDOMElement();
	});

	it('clears a rendered QR when a setting is changed afterwards', async () => {
		mockPage.url = new URL('http://localhost/?codes=036000291452');
		render(SetupPage);
		await fireEvent.click(screen.getByRole('button', { name: 'Share link' }));
		expect(screen.getByLabelText('QR code for the share link')).not.toBeEmptyDOMElement();
		await fireEvent.click(screen.getByRole('checkbox', { name: 'Loop' }));
		expect(screen.getByLabelText('QR code for the share link')).not.toBeVisible();
	});

	it('clears a rendered QR when the format is switched afterwards', async () => {
		mockPage.url = new URL('http://localhost/?codes=036000291452');
		render(SetupPage);
		await fireEvent.click(screen.getByRole('button', { name: 'Share link' }));
		expect(screen.getByLabelText('QR code for the share link')).not.toBeEmptyDOMElement();
		await fireEvent.change(screen.getByRole('combobox', { name: 'Format' }), {
			target: { value: 'code39' }
		});
		expect(screen.getByLabelText('QR code for the share link')).not.toBeVisible();
	});

	it('loads codes from a file into the textarea', async () => {
		render(SetupPage);
		vi.mocked(readCodesFile).mockResolvedValueOnce('036000291452\n012345678905');
		const fileInput = screen.getByLabelText('Load codes from a file');
		const file = new File(['x'], 'codes.txt', { type: 'text/plain' });
		Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
		await fireEvent.change(fileInput);
		await vi.waitFor(() =>
			expect(screen.getByRole('textbox', { name: 'Codes' })).toHaveValue(
				'036000291452\n012345678905'
			)
		);
		expect(items()).toHaveLength(2);
	});

	it('shows an inline file error and leaves the existing validation list untouched on read failure', async () => {
		mockPage.url = new URL('http://localhost/?codes=036000291452');
		render(SetupPage);
		const originalCount = items().length;
		const originalFirst = items()[0].textContent;
		expect(originalCount).toBeGreaterThan(0);

		vi.mocked(readCodesFile).mockRejectedValueOnce(new Error('boom'));
		const fileInput = screen.getByLabelText('Load codes from a file');
		const file = new File(['x'], 'codes.txt', { type: 'text/plain' });
		Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
		await fireEvent.change(fileInput);

		await vi.waitFor(() => expect(screen.getByText('Could not read file')).toBeVisible());
		expect(screen.getByText('Could not read file').textContent).toBe('Could not read file');
		expect(items()).toHaveLength(originalCount);
		expect(items()[0].textContent).toBe(originalFirst);
	});

	it('renders the grouped format dropdown with 36 options', () => {
		render(SetupPage);
		const select = screen.getByRole('combobox', { name: 'Format' });
		expect(within(select).getAllByRole('group')).toHaveLength(8);
		expect(within(select).getAllByRole('option')).toHaveLength(36);
		expect(select).toHaveValue('upc');
	});

	it('revalidates on format switch: HELLO flips invalid→valid and enables Start', async () => {
		render(SetupPage);
		await fireEvent.input(screen.getByRole('textbox', { name: 'Codes' }), {
			target: { value: 'HELLO' }
		});
		expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
		await fireEvent.change(screen.getByRole('combobox', { name: 'Format' }), {
			target: { value: 'code39' }
		});
		expect(exactText(items()[0], ' ✓')).toBe(' ✓');
		expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
	});

	it('switches the placeholder between the numeric and text copy', async () => {
		render(SetupPage);
		const input = screen.getByRole('textbox', { name: 'Codes' });
		expect(input).toHaveAttribute('placeholder', 'Paste codes — one per line, or comma-separated');
		await fireEvent.change(screen.getByRole('combobox', { name: 'Format' }), {
			target: { value: 'code128' }
		});
		expect(input).toHaveAttribute('placeholder', 'Paste codes — one per line');
	});

	it('shows exact arrow rows for encoder mutations, numeric and text', async () => {
		mockPage.url = new URL('http://localhost/?codes=590123412345&fmt=ean13');
		render(SetupPage);
		expect(items()[0].textContent).toBe('590123412345 ✓ → 5901234123457');
		await fireEvent.change(screen.getByRole('combobox', { name: 'Format' }), {
			target: { value: 'code39' }
		});
		await fireEvent.input(screen.getByRole('textbox', { name: 'Codes' }), {
			target: { value: 'hello' }
		});
		expect(items()[0].textContent).toBe('hello ✓ → HELLO');
	});

	it('shows no arrow for app-side whitespace stripping', async () => {
		render(SetupPage);
		await fireEvent.input(screen.getByRole('textbox', { name: 'Codes' }), {
			target: { value: '0360 00291452' }
		});
		expect(items()[0].textContent).toBe('0360 00291452 ✓');
	});

	it('carries a non-default format into the Start URL', async () => {
		mockPage.url = new URL('http://localhost/?codes=HELLO&fmt=code39&seed=0');
		render(SetupPage);
		await fireEvent.click(screen.getByRole('button', { name: 'Start' }));
		expect(goto.mock.calls[0][0]).toContain('fmt=code39');
	});
});

describe('setup page: error correction', () => {
	const X2000 = 'x'.repeat(2000);
	const setText = (v: string) =>
		fireEvent.input(screen.getByRole('textbox', { name: 'Codes' }), { target: { value: v } });
	const choose = (el: HTMLElement, v: string) => fireEvent.change(el, { target: { value: v } });
	const setFormat = (v: string) => choose(screen.getByRole('combobox', { name: 'Format' }), v);
	const setEcc = (v: string) =>
		choose(screen.getByRole('combobox', { name: 'Error correction' }), v);
	const firstRow = () => items()[0].textContent;

	it('validates hello world as qr with the facts row and shows the field at the default level', async () => {
		render(SetupPage);
		await setText('hello world');
		await setFormat('qr');
		expect(firstRow()).toBe('hello world ✓ · 21×21 modules · 11 bytes');
		const select = screen.getByRole('combobox', { name: 'Error correction' });
		expect(select).toHaveValue('M');
		expect(select).toHaveDisplayValue('level M (~15% recovery, default)');
		expect(screen.getByRole('combobox', { name: 'Error correction' })).toBeInTheDocument();
		const input = screen.getByRole('textbox', { name: 'Codes' });
		expect(input).toHaveAttribute('placeholder', 'Paste codes — one per line');
	});

	it('renders no field for upc or datamatrix', async () => {
		render(SetupPage);
		expect(screen.queryByRole('combobox', { name: 'Error correction' })).toBeNull();
		await setFormat('datamatrix');
		expect(screen.queryByRole('combobox', { name: 'Error correction' })).toBeNull();
	});

	it('applies the chosen level to validation and returns to the default', async () => {
		render(SetupPage);
		await setText(X2000);
		await setFormat('qr');
		expect(firstRow()).toBe(`${X2000} ✓ · 169×169 modules · 2000 bytes · dense`);
		await setEcc('H');
		expect(firstRow()).toBe(`${X2000} ✗ too long for QR Code (level H)`);
		await setEcc('M');
		expect(screen.getByRole('combobox', { name: 'Error correction' })).toHaveValue('M');
		expect(firstRow()).toBe(`${X2000} ✓ · 169×169 modules · 2000 bytes · dense`);
	});

	it('resets to the new format’s default when switching from qr at H to aztec', async () => {
		render(SetupPage);
		await setText('hello world');
		await setFormat('qr');
		await setEcc('H');
		await setFormat('aztec');
		const select = screen.getByRole('combobox', { name: 'Error correction' });
		expect(select).toHaveValue('23');
		expect(select).toHaveDisplayValue('≥23% error correction (default)');
		expect(firstRow()).toBe('hello world ✓ · 19×19 modules · 11 bytes');
	});
});

describe('setup page: fragment URLs and ecc in the Start URL', () => {
	const setEcc = (v: string) =>
		fireEvent.change(screen.getByRole('combobox', { name: 'Error correction' }), {
			target: { value: v }
		});

	it('ends the Start URL with &fmt=qr&ecc=H for qr at level H', async () => {
		mockPage.url = new URL('http://localhost/#codes=hello%20world&seed=0&fmt=qr&ecc=H');
		render(SetupPage);
		await fireEvent.click(screen.getByRole('button', { name: 'Start' }));
		expect(goto).toHaveBeenCalledWith(
			'/play#codes=hello+world&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=qr&ecc=H'
		);
	});

	it('drops ecc from the Start URL after choosing level H then level M', async () => {
		mockPage.url = new URL('http://localhost/#codes=hello%20world&seed=0&fmt=qr');
		render(SetupPage);
		await setEcc('H');
		await fireEvent.click(screen.getByRole('button', { name: 'Start' }));
		await setEcc('M');
		await fireEvent.click(screen.getByRole('button', { name: 'Start' }));
		expect(goto.mock.calls[0][0]).toMatch(/&fmt=qr&ecc=H$/);
		expect(goto.mock.calls[1][0]).toMatch(/&fmt=qr$/);
	});

	it('emits no ecc after switching from qr at H to aztec', async () => {
		mockPage.url = new URL('http://localhost/#codes=hello%20world&seed=0&fmt=qr&ecc=H');
		render(SetupPage);
		await fireEvent.change(screen.getByRole('combobox', { name: 'Format' }), {
			target: { value: 'aztec' }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Start' }));
		expect(goto.mock.calls[0][0]).toMatch(/^\/play#codes=hello\+world&/);
		expect(goto.mock.calls[0][0]).toMatch(/&fmt=aztec$/);
	});

	it('carries a payload with # & % + , and spaces into the Start URL unchanged', async () => {
		const codes = ['a#b&c%d+e,f g'];
		const s = { ...DEFAULT_SETTINGS, format: 'code128' as const, seed: 7 };
		mockPage.url = new URL('http://localhost/' + encodeShareUrl(codes, s));
		render(SetupPage);
		expect(screen.getByRole('textbox', { name: 'Codes' })).toHaveValue('a#b&c%d+e,f g');
		await fireEvent.click(screen.getByRole('button', { name: 'Start' }));
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
	const open = (url = 'http://localhost/?codes=036000291452&seed=0') => {
		mockPage.url = new URL(url);
		render(SetupPage);
	};
	const playback = () => screen.getByRole('combobox', { name: 'Playback' });
	const speedSlider = () => screen.getByRole('slider', { name: 'Speed' });
	const dwellSlider = () => screen.getByRole('slider', { name: 'Dwell' });
	const gapSlider = () => screen.getByRole('slider', { name: 'Gap' });
	const dwellSeconds = () => screen.getByRole('spinbutton', { name: 'Dwell in seconds' });
	const gapSeconds = () => screen.getByRole('spinbutton', { name: 'Gap in seconds' });
	const set = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });
	const slide = (el: HTMLElement, value: string) => fireEvent.input(el, { target: { value } });
	const start = async () => {
		await fireEvent.click(screen.getByRole('button', { name: 'Start' }));
		return goto.mock.calls.at(-1)?.[0];
	};

	it('offers Scroll and Step after Error correction and before Speed, showing scroll', () => {
		open('http://localhost/#codes=hello&fmt=qr');
		const opts = within(playback())
			.getAllByRole('option')
			.map((o) => [(o as HTMLOptionElement).value, (o as HTMLOptionElement).text]);
		expect(opts).toEqual([
			['scroll', 'Scroll'],
			['step', 'Step']
		]);
		expect(playback()).toHaveValue('scroll');
		expect(screen.getByRole('combobox', { name: 'Error correction' })).toAppearBefore(playback());
		expect(playback()).toAppearBefore(speedSlider());
	});

	it('replaces Speed with Dwell and Gap in Step, with their ranges and seconds fields', async () => {
		open();
		await set(playback(), 'step');
		expect(screen.queryByRole('slider', { name: 'Speed' })).toBeNull();
		const dwell = dwellSlider();
		expect(dwell).toHaveAttribute('min', '50');
		expect(dwell).toHaveAttribute('max', '5000');
		expect(dwell).toHaveAttribute('step', '10');
		expect(dwell).toHaveAttribute('aria-valuetext', '1.00 s');
		const gap = gapSlider();
		expect(gap).toHaveAttribute('min', '0');
		expect(gap).toHaveAttribute('max', '2000');
		expect(gap).toHaveAttribute('step', '10');
		expect(gap).toHaveAttribute('aria-valuetext', '0.00 s');
		expect(dwellSeconds()).toHaveDisplayValue('1.00');
		expect(gapSeconds()).toHaveDisplayValue('0.00');
		await slide(dwellSlider(), '500');
		expect(dwellSeconds()).toHaveDisplayValue('0.50');
	});

	it('takes typed seconds snapped and clamped, and shows the value again when unchanged', async () => {
		open();
		await set(playback(), 'step');
		await set(dwellSeconds(), '1');
		expect(dwellSlider()).toHaveValue('1000');
		expect(dwellSeconds()).toHaveDisplayValue('1.00');
		await set(dwellSeconds(), '0.4');
		expect(dwellSlider()).toHaveValue('400');
		expect(dwellSeconds()).toHaveDisplayValue('0.40');
		expect(await start()).toContain('&mode=step&dwell=400');
		await set(dwellSeconds(), '9');
		expect(dwellSlider()).toHaveValue('5000');
		expect(dwellSeconds()).toHaveDisplayValue('5.00');
		await set(dwellSeconds(), 'abc');
		expect(dwellSlider()).toHaveValue('5000');
		expect(dwellSeconds()).toHaveDisplayValue('5.00');
		await set(gapSeconds(), '2.5');
		expect(gapSlider()).toHaveValue('2000');
		expect(gapSeconds()).toHaveDisplayValue('2.00');
	});

	it('shows the flashing note for a dwell under 330 ms only', async () => {
		open();
		await set(playback(), 'step');
		await slide(dwellSlider(), '300');
		expect(screen.getByText(FLASH_NOTE)).toBeInTheDocument();
		await slide(dwellSlider(), '330');
		expect(screen.queryByText(FLASH_NOTE)).toBeNull();
	});

	it('names identical neighbours under Gap while the gap is under 1.00 s, in Step only', async () => {
		open('http://localhost/#codes=a%0Ab%0Ab&fmt=code128');
		expect(screen.queryByText(DUP_HINT)).toBeNull();
		await set(playback(), 'step');
		expect(screen.getByText(DUP_HINT).textContent).toBe(
			"Codes 2 and 3 are identical. Many scanners skip a repeat read: set a gap of 1.00 s or more, or lower the scanner's reread delay."
		);
		await fireEvent.input(screen.getByRole('textbox', { name: 'Codes' }), {
			target: { value: 'a\na\nb\nb' }
		});
		expect(screen.getByText(DUP_HINT)).toHaveTextContent(
			/^Codes 1 and 2 are identical, and 1 more neighboring pair\./
		);
		await slide(gapSlider(), '1000');
		expect(screen.queryByText(DUP_HINT)).toBeNull();
		await slide(gapSlider(), '990');
		expect(screen.getByText(DUP_HINT)).toBeInTheDocument();
		await set(playback(), 'scroll');
		expect(screen.queryByText(DUP_HINT)).toBeNull();
	});

	it('keeps a hidden dwell and a hidden speed across mode switches', async () => {
		open();
		await set(playback(), 'step');
		await slide(dwellSlider(), '500');
		await set(playback(), 'scroll');
		await slide(speedSlider(), '120');
		await set(playback(), 'step');
		expect(dwellSlider()).toHaveValue('500');
		await set(playback(), 'scroll');
		expect(speedSlider()).toHaveValue('120');
	});

	it('carries mode, dwell and gap into the Start URL in order', async () => {
		open();
		await set(playback(), 'step');
		expect(await start()).toMatch(/&fmt=upc&mode=step$/);
		await slide(dwellSlider(), '500');
		await slide(gapSlider(), '250');
		expect(await start()).toBe(
			'/play#codes=036000291452&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc&mode=step&dwell=500&gap=250'
		);
	});

	it('prefills Step and the dwell from a step link', () => {
		open('http://localhost/#codes=036000291452&mode=step&dwell=500');
		expect(playback()).toHaveValue('step');
		expect(dwellSlider()).toHaveValue('500');
		expect(dwellSeconds()).toHaveDisplayValue('0.50');
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
	/** Queries in the latest render: one test opens the page three times without unmounting (R1). */
	const ui = () => within(c);
	const open = (url = 'http://localhost/?codes=036000291452&seed=0') => {
		mockPage.url = new URL(url);
		c = render(SetupPage).container;
	};
	const rows = () => within(ui().getByRole('list', { name: 'Codes' })).getAllByRole('listitem');
	/** Each row's payload, in row order, read from its `Code k` textbox. */
	const payloads = () =>
		rows().map(
			(row, i) =>
				(within(row).getByRole('textbox', { name: `Code ${i + 1}` }) as HTMLTextAreaElement).value
		);
	/** Each row's format, in row order, read from its `Format of code k` select. */
	const formats = () =>
		rows().map(
			(row, i) =>
				(
					within(row).getByRole('combobox', {
						name: `Format of code ${i + 1}`
					}) as HTMLSelectElement
				).value
		);
	const set = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });
	const editor = (value: string) => set(ui().getByRole('combobox', { name: 'Editor' }), value);
	const note = () => within(ui().getByRole('alert')).getByRole('paragraph').textContent;
	const start = async () => {
		await fireEvent.click(ui().getByRole('button', { name: 'Start' }));
		return goto.mock.calls.at(-1)?.[0];
	};
	/** Mock one readCodesFile call to resolve to `text`, or reject when it is null, then pick a
	 *  file in the file input. */
	const upload = async (text: string | null) => {
		if (text === null) vi.mocked(readCodesFile).mockRejectedValueOnce(new Error('boom'));
		else vi.mocked(readCodesFile).mockResolvedValueOnce(text);
		const fileInput = ui().getByLabelText('Load codes from a file');
		const file = new File(['x'], 'codes.txt', { type: 'text/plain' });
		Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
		await fireEvent.change(fileInput);
	};
	const share = () => (ui().getByRole('textbox', { name: 'Share link' }) as HTMLInputElement).value;
	const lossy = async () => {
		open(MIXED);
		await editor('text');
	};

	it('opens in Plain text by default', () => {
		open();
		expect(ui().getByRole('combobox', { name: 'Editor' })).toHaveValue('text');
		expect(ui().getByRole('textbox', { name: 'Codes' })).toBeInTheDocument();
		expect(ui().queryByRole('list', { name: 'Codes' })).toBeNull();
	});

	it('opens a records link in Per row with its rows', () => {
		open(DECK);
		expect(ui().getByRole('combobox', { name: 'Editor' })).toHaveValue('rows');
		expect(ui().queryByRole('textbox', { name: 'Codes' })).toBeNull();
		expect(ui().queryByRole('list', { name: 'Validation results' })).toBeNull();
		expect(payloads()).toEqual(['036000291452', 'hello']);
		expect(formats()).toEqual(['upc', 'qr']);
		expect(ui().getByRole('combobox', { name: 'Error correction of code 2' })).toHaveValue('H');
	});

	it('shows the Editor hint in Plain text only', async () => {
		open();
		expect(ui().getByText(EDITOR_HINT).textContent).toBe(EDITOR_HINT);
		await editor('rows');
		expect(ui().queryByText(EDITOR_HINT)).toBeNull();
	});

	it('turns the list into one row per code at the list format', async () => {
		open('http://localhost/#codes=036000291452%2C012345678905&seed=0');
		await editor('rows');
		expect(payloads()).toEqual(['036000291452', '012345678905']);
		expect(formats()).toEqual(['upc', 'upc']);
	});

	it('copies the list level into the rows and swaps the list controls', async () => {
		open('http://localhost/#codes=hello%0Aworld&seed=0&fmt=qr&ecc=H');
		expect(ui().getByRole('combobox', { name: 'Format' })).toBeInTheDocument();
		await editor('rows');
		expect(formats()).toEqual(['qr', 'qr']);
		expect(ui().getByRole('combobox', { name: 'Error correction of code 1' })).toHaveValue('H');
		expect(ui().getByRole('combobox', { name: 'Error correction of code 2' })).toHaveValue('H');
		expect(ui().queryByRole('combobox', { name: 'Error correction' })).toBeNull();
		expect(ui().getByRole('combobox', { name: 'Format for new rows' })).toBeInTheDocument();
	});

	it('switches back at once when nothing is lost', async () => {
		open('http://localhost/#codes=hello%0Aworld&seed=0&fmt=qr&ecc=H');
		await editor('rows');
		await editor('text');
		expect(ui().getByRole('textbox', { name: 'Codes' })).toHaveValue('hello\nworld');
		expect(ui().getByRole('combobox', { name: 'Format' })).toHaveValue('qr');
		expect(ui().getByRole('combobox', { name: 'Error correction' })).toHaveValue('H');
		expect(ui().getByRole('combobox', { name: 'Editor' })).toHaveValue('text');
		expect(ui().queryByRole('alert')).toBeNull();
	});

	it('opens an empty codes= link in Plain text with its settings', () => {
		open('http://localhost/#codes=&speed=120&seed=0&fmt=qr');
		expect(ui().getByRole('combobox', { name: 'Editor' })).toHaveValue('text');
		expect(ui().getByRole('textbox', { name: 'Codes' })).toHaveValue('');
		expect(ui().getByRole('combobox', { name: 'Format' })).toHaveValue('qr');
		expect(ui().getByRole('slider', { name: 'Speed' })).toHaveValue('120');
	});

	it('shows the loss note on a lossy switch and stays in Per row', async () => {
		await lossy();
		expect(ui().getByRole('alert')).toBeInTheDocument();
		expect(note()).toBe(
			`${LIMIT} Switching now drops the format of 2 rows and cuts 1 payload at line breaks or commas. Every code will take the format of the first code, UPC-A.`
		);
		expect(ui().getByRole('combobox', { name: 'Editor' })).toHaveValue('rows');
		expect(rows()).toHaveLength(3);
	});

	it('keeps the note as a snapshot, and Switch anyway applies a list now lossless', async () => {
		await lossy();
		const before = note();
		await fireEvent.click(ui().getByRole('button', { name: 'Delete code 3' }));
		await fireEvent.click(ui().getByRole('button', { name: 'Delete code 2' }));
		expect(note()).toBe(before);
		await fireEvent.click(ui().getByRole('button', { name: 'Switch anyway' }));
		expect(ui().getByRole('textbox', { name: 'Codes' })).toHaveValue('036000291452');
		expect(ui().getByRole('combobox', { name: 'Editor' })).toHaveValue('text');
	});

	it('refreshes a stale note on Switch anyway, and switches on the second click', async () => {
		await lossy();
		const before = note();
		await set(ui().getByRole('combobox', { name: 'Format of code 2' }), 'upc');
		expect(note()).toBe(before);
		await fireEvent.click(ui().getByRole('button', { name: 'Switch anyway' }));
		expect(note()).toBe(
			`${LIMIT} Switching now drops the format of 1 row and cuts 1 payload at line breaks or commas. Every code will take the format of the first code, UPC-A.`
		);
		expect(ui().getByRole('combobox', { name: 'Editor' })).toHaveValue('rows');
		expect(rows()).toHaveLength(3);
		await fireEvent.click(ui().getByRole('button', { name: 'Switch anyway' }));
		expect(ui().getByRole('combobox', { name: 'Editor' })).toHaveValue('text');
	});

	it('takes a fresh snapshot when Plain text is chosen again', async () => {
		await lossy();
		await fireEvent.click(ui().getByRole('button', { name: 'Delete code 3' }));
		await editor('text');
		expect(note()).toBe(
			`${LIMIT} Switching now drops the format of 1 row. Every code will take the format of the first code, UPC-A.`
		);
	});

	it("applies the first code's format on Switch anyway and returns focus to the Editor select", async () => {
		await lossy();
		await fireEvent.click(ui().getByRole('button', { name: 'Switch anyway' }));
		expect(ui().getByRole('textbox', { name: 'Codes' })).toHaveValue(
			'036000291452\nhello\nline 1\nline 2'
		);
		expect(ui().getByRole('combobox', { name: 'Format' })).toHaveValue('upc');
		expect(ui().getByRole('combobox', { name: 'Editor' })).toHaveValue('text');
		expect(ui().queryByRole('alert')).toBeNull();
		expect(
			within(ui().getByRole('list', { name: 'Validation results' })).getAllByRole('listitem')
		).toHaveLength(4);
		await tick();
		expect(ui().getByRole('combobox', { name: 'Editor' })).toHaveFocus();
	});

	it('closes the note on Cancel, keeping the rows and returning focus', async () => {
		await lossy();
		await fireEvent.click(ui().getByRole('button', { name: 'Cancel' }));
		expect(ui().queryByRole('alert')).toBeNull();
		expect(ui().getByRole('combobox', { name: 'Editor' })).toHaveValue('rows');
		expect(rows()).toHaveLength(3);
		await tick();
		expect(ui().getByRole('combobox', { name: 'Editor' })).toHaveFocus();
	});

	it("carries records in the share link and Start, storing a default level as ''", async () => {
		open(DECK);
		expect(share()).toContain('#r1=upc_036000291452&r2=qr-H_hello&speed=60');
		expect(share()).not.toContain('codes=');
		expect(await start()).toBe(
			'/play#r1=upc_036000291452&r2=qr-H_hello&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc'
		);
		await set(ui().getByRole('combobox', { name: 'Error correction of code 2' }), 'M');
		expect(share()).toContain('r2=qr_hello&');
	});

	it('gives Add code the Format for new rows', async () => {
		open(DECK);
		await set(ui().getByRole('combobox', { name: 'Format for new rows' }), 'datamatrix');
		await fireEvent.click(ui().getByRole('button', { name: 'Add code' }));
		expect(ui().getByRole('combobox', { name: 'Format of code 3' })).toHaveValue('datamatrix');
	});

	it('appends an uploaded file as rows in Per row', async () => {
		open('http://localhost/#r1=upc_036000291452&r2=qr-H_hello&fmt=qr&ecc=H&seed=0');
		await upload('a\nb');
		await vi.waitFor(() => {
			expect(rows()).toHaveLength(4);
			expect(payloads()).toEqual(['036000291452', 'hello', 'a', 'b']);
			expect(formats()).toEqual(['upc', 'qr', 'qr', 'qr']);
			expect(ui().getByRole('combobox', { name: 'Error correction of code 2' })).toHaveValue('H');
			expect(ui().getByRole('combobox', { name: 'Error correction of code 3' })).toHaveValue('M');
			expect(ui().getByRole('combobox', { name: 'Error correction of code 4' })).toHaveValue('M');
		});
	});

	it('appends a CRLF file as rows with no CR left', async () => {
		open(DECK);
		await upload('a\r\nb\r\n');
		await vi.waitFor(() => {
			expect(rows()).toHaveLength(4);
			expect(payloads()).toEqual(['036000291452', 'hello', 'a', 'b']);
		});
	});

	it('clears the file error in Per row on a good read or a switch', async () => {
		open();
		await upload(null);
		await vi.waitFor(() => expect(ui().getByText('Could not read file')).toBeVisible());
		await editor('rows');
		expect(ui().queryByText('Could not read file')).toBeNull();
		open('http://localhost/#r1=upc_036000291452&seed=0');
		await upload(null);
		await vi.waitFor(() => {
			expect(ui().getByText('Could not read file')).toBeVisible();
			expect(ui().getByText('Could not read file').textContent).toBe('Could not read file');
		});
		await upload('c');
		await vi.waitFor(() => {
			expect(rows()).toHaveLength(2);
			expect(ui().queryByText('Could not read file')).toBeNull();
		});
		await upload(null);
		await vi.waitFor(() => expect(ui().getByText('Could not read file')).toBeVisible());
		await editor('text');
		expect(ui().getByRole('combobox', { name: 'Editor' })).toHaveValue('text');
		expect(ui().queryByText('Could not read file')).toBeNull();
		open(MIXED);
		await upload(null);
		await vi.waitFor(() => expect(ui().getByText('Could not read file')).toBeVisible());
		await editor('text');
		expect(ui().queryByText('Could not read file')).toBeNull();
		await upload(null);
		await vi.waitFor(() => expect(ui().getByText('Could not read file')).toBeVisible());
		await fireEvent.click(ui().getByRole('button', { name: 'Switch anyway' }));
		expect(ui().queryByText('Could not read file')).toBeNull();
	});

	it('names editor rows in the duplicate hint', async () => {
		open('http://localhost/#r1=qr_x&r2=qr_a&r3=qr_a&mode=step&seed=0');
		await fireEvent.input(ui().getByRole('textbox', { name: 'Code 1' }), {
			target: { value: '' }
		});
		expect(ui().getByText(DUP_HINT)).toHaveTextContent(/^Codes 2 and 3 are identical/);
	});

	it('switches an empty list to no rows, and a blank row changes neither Start nor the link', async () => {
		open('http://localhost/#codes=&seed=0');
		await editor('rows');
		expect(
			within(ui().getByRole('list', { name: 'Codes' })).queryAllByRole('listitem')
		).toHaveLength(0);
		expect(ui().getByRole('button', { name: 'Start' })).toBeDisabled();
		expect(share().endsWith(EMPTY)).toBe(true);
		await fireEvent.click(ui().getByRole('button', { name: 'Add code' }));
		expect(rows()).toHaveLength(1);
		expect(ui().getByRole('button', { name: 'Start' })).toBeDisabled();
		expect(share().endsWith(EMPTY)).toBe(true);
	});

	it("keeps each record's format on a link without fmt, and Start writes fmt=upc", async () => {
		open('http://localhost/#r1=qr_x&r2=datamatrix_y&seed=0');
		expect(formats()).toEqual(['qr', 'datamatrix']);
		expect(ui().getByRole('combobox', { name: 'Format for new rows' })).toHaveValue('upc');
		expect(ui().getByRole('combobox', { name: 'Format for new rows' })).toBeInTheDocument();
		expect(await start()).toBe(
			'/play#r1=qr_x&r2=datamatrix_y&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc'
		);
	});

	it('writes no record for a blank new row, and its record once typed', async () => {
		open(DECK);
		await set(ui().getByRole('combobox', { name: 'Format for new rows' }), 'qr');
		const before = share();
		await fireEvent.click(ui().getByRole('button', { name: 'Add code' }));
		expect(ui().getByRole('combobox', { name: 'Error correction of code 3' })).toHaveValue('M');
		expect(share()).toBe(before);
		await fireEvent.input(ui().getByRole('textbox', { name: 'Code 3' }), {
			target: { value: 'x' }
		});
		expect(share()).toContain('&r2=qr-H_hello&r3=qr_x&speed=60&');
		expect(share().endsWith('&fmt=qr')).toBe(true);
	});

	it('empties the deck on the last Delete, focusing Add code', async () => {
		open(DECK);
		await fireEvent.click(ui().getByRole('button', { name: 'Delete code 1' }));
		await fireEvent.click(ui().getByRole('button', { name: 'Delete code 1' }));
		await tick();
		expect(ui().getByRole('button', { name: 'Add code' })).toHaveFocus();
		expect(
			within(ui().getByRole('list', { name: 'Codes' })).queryAllByRole('listitem')
		).toHaveLength(0);
		expect(ui().getByRole('button', { name: 'Start' })).toBeDisabled();
		expect(share().endsWith(EMPTY)).toBe(true);
	});
});

describe('setup page: GS1 validation setting', () => {
	const S = '(01)09501101530003(17)261231(10)LOT42';
	const BAD = '(01)09501101530004';
	const GS1_LIMIT =
		'Plain text keeps one format, one error-correction level and one render-if-invalid setting for the whole list, and one code per line.';
	/** BAD's verdict in the validation list: strict, and with the box ticked (R6). */
	const INVALID = ' ✗ (01) GTIN: Bad checksum';
	const LENIENT =
		' ⚠ rendered anyway · (01) GTIN: Bad checksum · 134 modules wide · 16 characters → ]C1 0109501101530004';
	/** The scan-data verdict of 10LOT42, a GS, then 0109501101530003. */
	const GS_VERDICT = ' ✓ · 222 modules wide · 23 characters → ]C1 10LOT42␝0109501101530003';
	const list = (payload: string, tail = '') =>
		`http://localhost/#codes=${encodeURIComponent(payload)}&seed=0&fmt=gs1128${tail}`;
	const open = (url: string) => {
		mockPage.url = new URL(url);
		render(SetupPage);
	};
	const box = () => screen.getByRole('checkbox', { name: 'Render GS1 data that fails validation' });
	const set = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });
	const share = () =>
		(screen.getByRole('textbox', { name: 'Share link' }) as HTMLInputElement).value;
	const rows = () => within(screen.getByRole('list', { name: 'Codes' })).getAllByRole('listitem');
	/** Each row's render-if-invalid box, in row order, as checked or not. */
	const rowBoxes = () =>
		rows().map(
			(row, i) =>
				(
					within(row).getByRole('checkbox', {
						name: `Render code ${i + 1} if invalid`
					}) as HTMLInputElement
				).checked
		);

	it('shows the box, its note, the GS1 hint and the GS1 placeholder for a GS1 list, after the level select', async () => {
		open(list(S));
		expect(box()).not.toBeChecked();
		expect(box()).toBeInTheDocument();
		expect(screen.getByText(LAX_NOTE).textContent).toBe(LAX_NOTE);
		expect(box()).toHaveAccessibleDescription(LAX_NOTE);
		expect(screen.getByText(GS1_HINT).textContent).toBe(GS1_HINT);
		expect(screen.getByRole('textbox', { name: 'Codes' })).toHaveAttribute(
			'placeholder',
			'Paste GS1 element strings or scan data — one per line'
		);
		expect(screen.getByRole('combobox', { name: 'Format' })).toAppearBefore(box());
		expect(box()).toAppearBefore(screen.getByRole('combobox', { name: 'Playback' }));
		await set(screen.getByRole('combobox', { name: 'Format' }), 'gs1qr');
		expect(screen.getByRole('combobox', { name: 'Error correction' })).toAppearBefore(box());
		expect(box()).toAppearBefore(screen.getByRole('combobox', { name: 'Playback' }));
		await set(screen.getByRole('combobox', { name: 'Format' }), 'upc');
		expect(
			screen.queryByRole('checkbox', { name: 'Render GS1 data that fails validation' })
		).toBeNull();
		expect(screen.queryByText(LAX_NOTE)).toBeNull();
		expect(screen.queryByText(GS1_HINT)).toBeNull();
		expect(screen.getByRole('textbox', { name: 'Codes' })).toHaveAttribute(
			'placeholder',
			'Paste codes — one per line, or comma-separated'
		);
	});

	it('prefills the box from lax=1, flags the row amber with the scan hint, and clears when the format leaves GS1', async () => {
		open(list(BAD, '&lax=1'));
		expect(box()).toBeChecked();
		expect(exactText(items()[0], LENIENT)).toBe(LENIENT);
		expect(screen.getByText(SCAN_HINT).textContent).toBe(SCAN_HINT);
		expect(share()).toContain('&fmt=gs1128&lax=1');
		expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
		await set(screen.getByRole('combobox', { name: 'Format' }), 'upc');
		await set(screen.getByRole('combobox', { name: 'Format' }), 'gs1128');
		expect(box()).not.toBeChecked();
		expect(share()).not.toContain('lax=');
		expect(exactText(items()[0], INVALID)).toBe(INVALID);
		expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
	});

	it('ticks the box, validates leniently and writes lax=1 at the end of the link', async () => {
		open(list(BAD));
		expect(exactText(items()[0], INVALID)).toBe(INVALID);
		await fireEvent.click(box());
		expect(exactText(items()[0], LENIENT)).toBe(LENIENT);
		expect(share()).toMatch(/&fmt=gs1128&lax=1$/);
	});

	it('carries the box into Per row rows and back, hiding the page box in Per row', async () => {
		open(list(`${BAD}\n${S}`, '&lax=1'));
		await set(screen.getByRole('combobox', { name: 'Editor' }), 'rows');
		expect(
			screen.queryByRole('checkbox', { name: 'Render GS1 data that fails validation' })
		).toBeNull();
		expect(rowBoxes()).toEqual([true, true]);
		expect(screen.getAllByText(LAX_NOTE)).toHaveLength(1); // the row editor's
		expect(screen.getAllByText(GS1_HINT)).toHaveLength(1);
		await set(screen.getByRole('combobox', { name: 'Editor' }), 'text');
		expect(screen.queryByRole('alert')).toBeNull();
		expect(box()).toBeChecked();
		expect(share()).toContain('&fmt=gs1128&lax=1');
	});

	it('words the render-if-invalid loss on a mixed switch', async () => {
		open(
			`http://localhost/#r1=gs1128_${encodeURIComponent(S)}&r2=gs1128-lax_${encodeURIComponent(S)}&seed=0`
		);
		await set(screen.getByRole('combobox', { name: 'Editor' }), 'text');
		expect(within(screen.getByRole('alert')).getByRole('paragraph').textContent).toBe(
			`${GS1_LIMIT} Switching now drops the render-if-invalid setting of 1 row. Every code will take the format of the first code, GS1-128, with invalid GS1 data skipped.`
		);
	});

	it('appends uploaded rows with the box off', async () => {
		open(`http://localhost/#r1=gs1128-lax_${encodeURIComponent(BAD)}&fmt=gs1128&lax=1&seed=0`);
		vi.mocked(readCodesFile).mockResolvedValueOnce(S);
		const fileInput = screen.getByLabelText('Load codes from a file');
		Object.defineProperty(fileInput, 'files', {
			value: [new File(['x'], 'codes.txt', { type: 'text/plain' })],
			configurable: true
		});
		await fireEvent.change(fileInput);
		await tick();
		expect(rowBoxes()).toEqual([true, false]);
	});

	it('shows a GS in the list as the mark, with the scan-data verdict', () => {
		open(list(`]C110LOT42${'\u001d'}0109501101530003`));
		const raw = ']C110LOT42␝0109501101530003';
		expect(exactText(items()[0], raw)).toBe(raw);
		expect(exactText(items()[0], GS_VERDICT)).toBe(GS_VERDICT);
	});

	it('keeps a real GS in a row record and shows the same verdict', () => {
		open('http://localhost/#r1=gs1128_10LOT42%1D0109501101530003&seed=0');
		expect(screen.getByRole('textbox', { name: 'Code 1' })).toHaveValue(
			'10LOT42\u001d0109501101530003'
		);
		expect(exactText(rows()[0], GS_VERDICT)).toBe(GS_VERDICT);
	});
});
