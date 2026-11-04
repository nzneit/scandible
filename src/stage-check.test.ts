import { describe, it, expect } from 'vitest';
import {
	diffPixels,
	nonWhiteShare,
	parseReady,
	resolveRoute,
	sameGeometry,
	viewportMismatch,
	type Ready
} from '../scripts/stage-check';

const white = (w: number, h: number) => ({
	width: w,
	height: h,
	data: new Uint8Array(w * h * 4).fill(255)
});

describe('resolveRoute', () => {
	it.each([
		['/scandible/', 'index.html'],
		['/scandible', 'index.html'],
		['/scandible/index.html', 'index.html'],
		['/scandible/play', 'play.html'],
		['/scandible/_app/immutable/entry/start.js', '_app/immutable/entry/start.js'],
		['/scandible/../package.json', null],
		['/favicon.ico', null],
		['/scandiblex/a.js', null]
	])('maps %s to %s', (pathname, file) => {
		expect(resolveRoute(pathname)).toBe(file);
	});
});

it('nonWhiteShare counts pixels with red, green or blue below 255, ignoring alpha', () => {
	expect(nonWhiteShare(white(2, 2))).toBe(0);
	const dark = white(2, 2);
	dark.data[0] = 0;
	expect(nonWhiteShare(dark)).toBe(0.25);
	const transparent = white(2, 2);
	transparent.data[3] = 0;
	expect(nonWhiteShare(transparent)).toBe(0);
});

it('diffPixels counts the pixels whose RGBA differs, and -1 when the sizes differ', () => {
	expect(diffPixels(white(2, 2), white(2, 2))).toBe(0);
	const changed = white(2, 2);
	changed.data[6] = 254;
	expect(diffPixels(white(2, 2), changed)).toBe(1);
	expect(diffPixels(white(2, 2), white(2, 3))).toBe(-1);
});

it('sameGeometry compares displays exactly and sizes within the tolerance', () => {
	const r: Ready = {
		item: { width: 210, height: 120, display: 'flex' },
		svg: { width: 190, height: 100, display: 'block' },
		viewport: { width: 1280, height: 900 }
	};
	expect(sameGeometry(r, structuredClone(r), 0.01)).toBe(true);
	const narrow = structuredClone(r);
	narrow.svg.width = 190.005;
	expect(sameGeometry(r, narrow, 0.01)).toBe(true);
	const tall = structuredClone(r);
	tall.svg.height = 100.02;
	expect(sameGeometry(r, tall, 0.01)).toBe(false);
	const block = structuredClone(r);
	block.item.display = 'block';
	expect(sameGeometry(r, block, 0.01)).toBe(false);
});

describe('parseReady', () => {
	const item = { width: 210, height: 120, display: 'flex' };
	const svg = { width: 190, height: 100, display: 'block' };

	it('carries the item, the svg and the viewport', () => {
		const text = JSON.stringify({ item, svg, viewport: { width: 1280, height: 900 } });
		expect(parseReady(text)).toEqual({ item, svg, viewport: { width: 1280, height: 900 } });
	});

	it.each([
		['no viewport', JSON.stringify({ item, svg })],
		[
			'a viewport that is not two numbers',
			JSON.stringify({ item, svg, viewport: { width: '1280' } })
		]
	])('gives a null viewport for %s', (_, text) => {
		expect(parseReady(text)).toEqual({ item, svg, viewport: null });
	});

	it.each([
		['text that is not JSON', 'x'],
		['no svg', JSON.stringify({ item, viewport: { width: 1280, height: 900 } })],
		['JSON null', 'null']
	])('gives null for %s', (_, text) => {
		expect(parseReady(text)).toBeNull();
	});
});

describe('viewportMismatch', () => {
	it('passes the requested size', () => {
		expect(viewportMismatch([1280, 900], { width: 1280, height: 900 })).toBeNull();
	});

	it.each([
		[{ width: 1366, height: 768 }, 'viewport 1366x768, requested 1280x900'],
		[{ width: 1280, height: 814 }, 'viewport 1280x814, requested 1280x900'],
		[null, 'no viewport reported, requested 1280x900']
	])('names both sizes for %j', (viewport, reason) => {
		expect(viewportMismatch([1280, 900], viewport)).toBe(reason);
	});
});
