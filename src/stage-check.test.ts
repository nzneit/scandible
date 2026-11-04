import { describe, it, expect } from 'vitest';
import {
	diffPixels,
	nonWhiteShare,
	resolveRoute,
	sameGeometry,
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
		svg: { width: 190, height: 100, display: 'block' }
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
