import { describe, expect, it, vi } from 'vitest';
import * as bwip from 'bwip-js/browser';
import { parseCodeList } from '$lib/codes';

vi.mock('bwip-js/browser', async (importOriginal) => {
	const actual = await importOriginal<typeof import('bwip-js/browser')>();
	return { ...actual, qrcode: vi.fn(actual.qrcode) };
});

describe('bwip-js encode cache', () => {
	it('keeps every entry of a list larger than the old 2,000-entry cap', () => {
		const text = Array.from({ length: 2500 }, (_, i) => `line${i}`).join('\n');
		const qrcode = vi.mocked(bwip.qrcode);
		parseCodeList(text, 'qr', '');
		expect(qrcode).toHaveBeenCalledTimes(2500);
		qrcode.mockClear();
		parseCodeList(text, 'qr', '');
		expect(qrcode).toHaveBeenCalledTimes(0);
	}, 60_000);
});
