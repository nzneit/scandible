import { describe, it, expect } from 'vitest';
import { buildItems } from './items';
import { parseCodeList } from './codes';
import { buildTransforms } from './transforms';
import { DEFAULT_SETTINGS, type CodeEntry } from './types';

const entry = (value: string, valid: boolean): CodeEntry => ({
	raw: value,
	value,
	format: 'upc',
	options: {},
	valid
});
const upc = [entry('036000291452', true), entry('012345678905', true)];
const has = (el: HTMLElement, cls: string) => el.classList.contains(cls);

describe('buildItems', () => {
	it('builds one .barcode-item holding one svg per entry, in order', () => {
		const items = buildItems([...parseCodeList('hello', 'qr'), ...upc], DEFAULT_SETTINGS);
		expect(items.map((i) => has(i, 'barcode-item') && i.querySelectorAll('svg').length)).toEqual([
			1, 1, 1
		]);
		expect(items.map((i) => has(i, 'barcode-item--qr'))).toEqual([true, false, false]);
	});

	it('marks 2D items with barcode-item--2d and --qr, and upc items with neither', () => {
		// DEFAULT_SETTINGS.format is upc: the classes come from each entry
		for (const i of buildItems(parseCodeList('hello world', 'qr'), DEFAULT_SETTINGS))
			expect([has(i, 'barcode-item--2d'), has(i, 'barcode-item--qr')]).toEqual([true, true]);
		for (const i of buildItems(upc, DEFAULT_SETTINGS))
			expect([has(i, 'barcode-item--2d'), has(i, 'barcode-item--upc')]).toEqual([false, false]);
	});

	it('applies the seeded transform per index, and builds new elements on every call', () => {
		expect(buildItems(upc, DEFAULT_SETTINGS)[0].style.transform).toBe('');
		const rotOnly = { ...DEFAULT_SETTINGS, rotate: true, rotateMaxDeg: 10, seed: 5 };
		expect(buildItems(upc, rotOnly)[0].style.transform).toMatch(/^rotate\(/);
		const skewed = { ...DEFAULT_SETTINGS, skew: true, skewMaxDeg: 10, seed: 5 };
		const opts = { rotate: false, rotateMaxDeg: 8, skew: true, skewMaxDeg: 10 };
		const [a, b] = [buildItems(upc, skewed), buildItems(upc, skewed)];
		expect(a.map((i) => i.style.transform)).toEqual(buildTransforms(2, opts, 5));
		expect(b.map((i) => i.style.transform)).toEqual(a.map((i) => i.style.transform));
		expect(b[0]).not.toBe(a[0]);
	});
});
