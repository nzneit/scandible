import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createScroller } from './scroller';
import type { CodeEntry } from './types';

const entry = (value: string, valid: boolean): CodeEntry => ({ raw: value, value, valid });
const entries: CodeEntry[] = [
	entry('036000291452', true),
	entry('bad', false),
	entry('012345678905', true)
];

let container: HTMLElement;
beforeEach(() => {
	container = document.createElement('div');
	document.body.appendChild(container);
});

describe('createScroller', () => {
	it('renders two copies of the valid entries only, and starts paused', () => {
		const s = createScroller(container, entries, {
			speedPxPerSec: 60,
			loop: false,
			rotate: false,
			rotateMaxDeg: 8,
			skew: false,
			skewMaxDeg: 8,
			seed: 0,
			format: 'upc'
		});
		// 2 valid entries × 2 copies = 4 barcode items
		expect(container.querySelectorAll('.barcode-item').length).toBe(4);
		expect(s.isPlaying()).toBe(false);
		s.destroy();
	});

	it('hides copy 2 when loop is off and shows it when on', () => {
		const s = createScroller(container, entries, {
			speedPxPerSec: 60,
			loop: false,
			rotate: false,
			rotateMaxDeg: 8,
			skew: false,
			skewMaxDeg: 8,
			seed: 0,
			format: 'upc'
		});
		const copies = container.querySelectorAll<HTMLElement>('.scroller-copy');
		expect(copies[1].style.display).toBe('none');
		s.setLoop(true);
		expect(copies[1].style.display).toBe('');
		s.setLoop(false);
		expect(copies[1].style.display).toBe('none');
		s.destroy();
	});

	it('play() and pause() flip the playing state', () => {
		const s = createScroller(container, entries, {
			speedPxPerSec: 60,
			loop: true,
			rotate: false,
			rotateMaxDeg: 8,
			skew: false,
			skewMaxDeg: 8,
			seed: 0,
			format: 'upc'
		});
		s.play();
		expect(s.isPlaying()).toBe(true);
		s.pause();
		expect(s.isPlaying()).toBe(false);
		s.destroy();
	});

	it('does not fire onFinish on the first frame of a loop-off scroll (measures a visible copy)', () => {
		// Regression: measure() must derive contentHeight from copy 1's own (visible) height,
		// never from copy 2 — which is display:none while loop is off, so its rect is all
		// zeros. If contentHeight were <= 0, isAtEnd(0, contentHeight, false) would be true and
		// onFinish would fire on the very first frame — the scroll would never actually scroll.
		const realRect = Element.prototype.getBoundingClientRect;
		Element.prototype.getBoundingClientRect = function () {
			return {
				height: 500,
				top: 0,
				left: 0,
				right: 0,
				bottom: 500,
				width: 300,
				x: 0,
				y: 0,
				toJSON() {}
			} as DOMRect;
		};

		let frameCb: FrameRequestCallback | null = null;
		const realRaf = globalThis.requestAnimationFrame;
		globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
			frameCb = cb;
			return 1;
		}) as typeof globalThis.requestAnimationFrame;

		try {
			const onFinish = vi.fn();
			const s = createScroller(
				container,
				entries,
				{
					speedPxPerSec: 60,
					loop: false,
					rotate: false,
					rotateMaxDeg: 8,
					skew: false,
					skewMaxDeg: 8,
					seed: 0,
					format: 'upc'
				},
				onFinish
			);
			s.play();
			expect(frameCb).not.toBeNull();
			frameCb!(16);
			expect(onFinish).not.toHaveBeenCalled();
			s.destroy();
		} finally {
			Element.prototype.getBoundingClientRect = realRect;
			globalThis.requestAnimationFrame = realRaf;
		}
	});

	it('applies the same transform per index to both copies when a distortion is on', () => {
		const s = createScroller(container, entries, {
			speedPxPerSec: 60,
			loop: false,
			rotate: false,
			rotateMaxDeg: 10,
			skew: true,
			skewMaxDeg: 10,
			seed: 5,
			format: 'upc'
		});
		const copies = container.querySelectorAll<HTMLElement>('.scroller-copy');
		const items0 = copies[0].querySelectorAll<HTMLElement>('.barcode-item');
		const items1 = copies[1].querySelectorAll<HTMLElement>('.barcode-item');
		expect(items0[0].style.transform).not.toBe('');
		expect(items0[0].style.transform).toBe(items1[0].style.transform);
		expect(items0[1].style.transform).toBe(items1[1].style.transform);
		s.destroy();
	});

	it('transforms barcodes when only rotation is on', () => {
		const s = createScroller(container, entries, {
			speedPxPerSec: 60,
			loop: false,
			rotate: true,
			rotateMaxDeg: 10,
			skew: false,
			skewMaxDeg: 10,
			seed: 5,
			format: 'upc'
		});
		const item = container.querySelector<HTMLElement>('.barcode-item')!;
		expect(item.style.transform).toMatch(/^rotate\(/);
		s.destroy();
	});

	it('drives the track with a 3D translate so it is GPU-layer promoted', () => {
		const s = createScroller(container, entries, {
			speedPxPerSec: 60,
			loop: false,
			rotate: false,
			rotateMaxDeg: 8,
			skew: false,
			skewMaxDeg: 8,
			seed: 0,
			format: 'upc'
		});
		const track = container.querySelector<HTMLElement>('.scroller-track')!;
		// Initial render (offset 0) must use the 3D transform form, not translateY.
		expect(track.style.transform).toBe('translate3d(0, 0px, 0)');
		s.destroy();
	});

	it('leaves barcode items untransformed when both distortions are off', () => {
		const s = createScroller(container, entries, {
			speedPxPerSec: 60,
			loop: false,
			rotate: false,
			rotateMaxDeg: 10,
			skew: false,
			skewMaxDeg: 10,
			seed: 5,
			format: 'upc'
		});
		const item = container.querySelector<HTMLElement>('.barcode-item')!;
		expect(item.style.transform).toBe('');
		s.destroy();
	});
});
