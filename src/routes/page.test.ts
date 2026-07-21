import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SetupPage from './+page.svelte';
import { readUpcFile } from '$lib/fileInput';

const mockPage = vi.hoisted(() => ({ url: new URL('http://localhost/') }));
const goto = vi.hoisted(() => vi.fn());
vi.mock('$app/state', () => ({ page: mockPage }));
vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$app/paths', () => ({ resolve: (id: string) => id }));
vi.mock('$lib/fileInput', () => ({ readUpcFile: vi.fn() }));

const q = <T extends Element>(c: Element, sel: string) => c.querySelector(sel) as T;

beforeEach(() => {
	mockPage.url = new URL('http://localhost/');
	goto.mockReset();
});

describe('setup page', () => {
	it('prefills the textarea and settings from the URL', () => {
		mockPage.url = new URL('http://localhost/?codes=036000291452&speed=120&loop=1');
		const { container } = render(SetupPage);
		expect(q<HTMLTextAreaElement>(container, '.upc-input').value).toBe('036000291452');
		expect(q<HTMLInputElement>(container, '.speed-input').value).toBe('120');
		expect(q<HTMLInputElement>(container, '.loop-input').checked).toBe(true);
	});

	it('flags invalid entries and disables Start until there is a valid one', async () => {
		const { container } = render(SetupPage);
		const input = q<HTMLTextAreaElement>(container, '.upc-input');
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
			'/play?codes=036000291452&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0'
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
		await fireEvent.input(q(container, '.upc-input'), { target: { value: '012345678905' } });
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

	it('loads codes from a file into the textarea', async () => {
		const { container } = render(SetupPage);
		vi.mocked(readUpcFile).mockResolvedValueOnce('036000291452\n012345678905');
		const fileInput = q<HTMLInputElement>(container, '.file-input');
		const file = new File(['x'], 'codes.txt', { type: 'text/plain' });
		Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
		await fireEvent.change(fileInput);
		await vi.waitFor(() =>
			expect(q<HTMLTextAreaElement>(container, '.upc-input').value).toBe(
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

		vi.mocked(readUpcFile).mockRejectedValueOnce(new Error('boom'));
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
});
