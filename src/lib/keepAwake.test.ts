import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createKeepAwake, keepAwakeNote, type KeepAwakeState } from './keepAwake';

/** A sentinel; `drop()` is the browser releasing it, `release()` the controller doing so. */
class FakeSentinel extends EventTarget {
	released = false;
	readonly type = 'screen';
	onrelease = null;
	release = vi.fn(async () => this.drop());
	drop() {
		if (this.released) return;
		this.released = true;
		this.dispatchEvent(new Event('release'));
	}
}

type FakeDoc = EventTarget & { visibilityState: DocumentVisibilityState };

function fakeDoc(): FakeDoc {
	return Object.assign(new EventTarget(), {
		visibilityState: 'visible' as DocumentVisibilityState
	});
}

function show(doc: FakeDoc, state: DocumentVisibilityState) {
	doc.visibilityState = state;
	doc.dispatchEvent(new Event('visibilitychange'));
}

/** Lets a settled request's handlers run. */
const settle = () => new Promise((done) => setTimeout(done, 0));

function fakeLock() {
	const sentinels: FakeSentinel[] = [];
	const asks: { resolve: (sentinel: FakeSentinel) => void; reject: (error: unknown) => void }[] =
		[];
	const request = vi.fn(
		() => new Promise<FakeSentinel>((resolve, reject) => asks.push({ resolve, reject }))
	);
	return {
		lock: { request },
		request,
		sentinels,
		async grant(i: number) {
			const sentinel = new FakeSentinel();
			sentinels.push(sentinel);
			asks[i].resolve(sentinel);
			await settle();
		},
		async refuse(i: number) {
			asks[i].reject(new DOMException('blocked', 'NotAllowedError'));
			await settle();
		}
	};
}

function make(lock?: object, doc: FakeDoc = fakeDoc()) {
	const onState = vi.fn<(state: KeepAwakeState) => void>();
	const keep = createKeepAwake({
		wakeLock: lock as unknown as WakeLock | undefined,
		doc: doc as unknown as Document,
		onState
	});
	return { keep, onState, doc };
}

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(0);
});

afterEach(() => {
	vi.useRealTimers();
});

describe('createKeepAwake', () => {
	it('is unavailable when wanted with no API, and off when no longer wanted', () => {
		const { keep, onState } = make(undefined);
		keep.want(true);
		expect(keep.state()).toBe('unavailable');
		keep.want(false);
		expect(keep.state()).toBe('off');
		expect(onState.mock.calls.flat()).toEqual(['unavailable', 'off']);
	});

	it('asks for a screen lock on a visible tab and holds it once granted', async () => {
		const fake = fakeLock();
		const { keep, onState } = make(fake.lock);
		keep.want(true);
		expect(fake.request).toHaveBeenCalledTimes(1);
		expect(fake.request).toHaveBeenCalledWith('screen');
		expect(keep.state()).toBe('off');
		expect(onState.mock.calls.flat()).toEqual([]);
		await fake.grant(0);
		expect(keep.state()).toBe('held');
		expect(onState.mock.calls.flat()).toEqual(['held']);
	});

	it('is refused when the request is rejected', async () => {
		const fake = fakeLock();
		const { keep } = make(fake.lock);
		keep.want(true);
		await fake.refuse(0);
		expect(keep.state()).toBe('refused');
	});

	it('reports off for a refusal that arrives on a hidden tab, and asks again when it returns', async () => {
		const fake = fakeLock();
		const { keep, onState, doc } = make(fake.lock);
		keep.want(true);
		show(doc, 'hidden');
		await fake.refuse(0);
		expect(keep.state()).toBe('off');
		expect(onState.mock.calls.flat()).not.toContain('refused');
		show(doc, 'visible');
		expect(fake.request).toHaveBeenCalledTimes(2);
	});

	it('waits for a visible tab, and asks nothing for a tab that returns unwanted', () => {
		const fake = fakeLock();
		const doc = fakeDoc();
		doc.visibilityState = 'hidden';
		const { keep } = make(fake.lock, doc);
		show(doc, 'visible');
		expect(fake.request).toHaveBeenCalledTimes(0);
		show(doc, 'hidden');
		keep.want(true);
		expect(fake.request).toHaveBeenCalledTimes(0);
		expect(keep.state()).toBe('off');
		show(doc, 'visible');
		expect(fake.request).toHaveBeenCalledTimes(1);
	});

	it('asks once while a lock is held or a request is pending', async () => {
		const fake = fakeLock();
		const { keep } = make(fake.lock);
		keep.want(true);
		keep.want(true);
		expect(fake.request).toHaveBeenCalledTimes(1);
		await fake.grant(0);
		keep.want(true);
		expect(fake.request).toHaveBeenCalledTimes(1);
	});

	it('releases a lock granted after it stopped being wanted', async () => {
		const fake = fakeLock();
		const { keep, onState } = make(fake.lock);
		keep.want(true);
		keep.want(false);
		await fake.grant(0);
		expect(fake.sentinels[0].release).toHaveBeenCalledTimes(1);
		expect(keep.state()).toBe('off');
		expect(onState.mock.calls.flat()).not.toContain('held');
	});

	it('ignores a refusal that arrives after it stopped being wanted', async () => {
		const fake = fakeLock();
		const { keep, onState } = make(fake.lock);
		keep.want(true);
		keep.want(false);
		await fake.refuse(0);
		expect(keep.state()).toBe('off');
		expect(onState.mock.calls.flat()).toEqual([]);
	});

	it('releases the lock when it is no longer wanted, and does not ask again', async () => {
		const fake = fakeLock();
		const { keep } = make(fake.lock);
		keep.want(true);
		await fake.grant(0);
		keep.want(false);
		expect(fake.sentinels[0].release).toHaveBeenCalledTimes(1);
		expect(keep.state()).toBe('off');
		expect(fake.request).toHaveBeenCalledTimes(1);
	});

	it('asks again when the tab returns after the browser released the lock', async () => {
		const fake = fakeLock();
		const { keep, doc } = make(fake.lock);
		keep.want(true);
		await fake.grant(0);
		show(doc, 'hidden');
		fake.sentinels[0].drop();
		expect(keep.state()).toBe('off');
		expect(fake.request).toHaveBeenCalledTimes(1);
		show(doc, 'visible');
		expect(fake.request).toHaveBeenCalledTimes(2);
		await fake.grant(1);
		expect(keep.state()).toBe('held');
	});

	it('asks again at once when the browser releases the lock on a visible tab', async () => {
		const fake = fakeLock();
		const { keep } = make(fake.lock);
		keep.want(true);
		await fake.grant(0);
		fake.sentinels[0].drop();
		expect(fake.request).toHaveBeenCalledTimes(2);
		await fake.refuse(1);
		expect(keep.state()).toBe('refused');
	});

	it('after a refusal asks again only when the tab returns', async () => {
		const fake = fakeLock();
		const { keep, doc } = make(fake.lock);
		keep.want(true);
		await fake.refuse(0);
		keep.want(true);
		expect(fake.request).toHaveBeenCalledTimes(1);
		show(doc, 'hidden');
		expect(fake.request).toHaveBeenCalledTimes(1);
		show(doc, 'visible');
		expect(fake.request).toHaveBeenCalledTimes(2);
	});

	it('retry() asks again while refused, at most once a second, never while a request is pending', async () => {
		const fake = fakeLock();
		const { keep } = make(fake.lock);
		keep.want(true);
		await fake.refuse(0);
		vi.setSystemTime(999);
		keep.retry();
		expect(fake.request).toHaveBeenCalledTimes(1);
		vi.setSystemTime(1000);
		keep.retry();
		expect(fake.request).toHaveBeenCalledTimes(2);
		keep.retry();
		expect(fake.request).toHaveBeenCalledTimes(2);
		await fake.refuse(1);
		expect(keep.state()).toBe('refused');
	});

	it('retry() does nothing unless refused and wanted', async () => {
		const held = fakeLock();
		const first = make(held.lock);
		first.keep.want(true);
		await held.grant(0);
		vi.setSystemTime(5000);
		first.keep.retry();
		expect(held.request).toHaveBeenCalledTimes(1);

		const none = make(undefined);
		none.keep.want(true);
		none.keep.retry();
		expect(none.keep.state()).toBe('unavailable');

		const refused = fakeLock();
		const last = make(refused.lock);
		last.keep.want(true);
		await refused.refuse(0);
		last.keep.want(false);
		vi.setSystemTime(10000);
		last.keep.retry();
		expect(refused.request).toHaveBeenCalledTimes(1);
	});

	it('reports a state only when it changes', async () => {
		const fake = fakeLock();
		const { keep, onState } = make(fake.lock);
		keep.want(true);
		await fake.grant(0);
		keep.want(true);
		keep.want(false);
		keep.want(false);
		expect(onState.mock.calls.flat()).toEqual(['held', 'off']);
	});

	it('destroy() releases the lock, stops listening and ignores later calls', async () => {
		const fake = fakeLock();
		const { keep, onState, doc } = make(fake.lock);
		keep.want(true);
		await fake.grant(0);
		keep.destroy();
		expect(fake.sentinels[0].release).toHaveBeenCalledTimes(1);
		expect(onState.mock.calls.flat()).toEqual(['held', 'off']);
		show(doc, 'visible');
		keep.want(true);
		keep.retry();
		expect(fake.request).toHaveBeenCalledTimes(1);
		expect(onState.mock.calls.flat()).toEqual(['held', 'off']);
		expect(keep.state()).toBe('off');
	});

	it('releases a lock granted after destroy(), and reports nothing', async () => {
		const fake = fakeLock();
		const { keep, onState } = make(fake.lock);
		keep.want(true);
		keep.destroy();
		await fake.grant(0);
		expect(fake.sentinels[0].release).toHaveBeenCalledTimes(1);
		expect(onState.mock.calls.flat()).toEqual([]);
	});
});

describe('keepAwakeNote', () => {
	const UNAVAILABLE =
		"This browser can't keep the screen awake. The screen may turn off during the run.";
	const REFUSED =
		'Keep-awake was blocked, perhaps by battery saver. The screen may turn off during the run.';

	it.each([
		[false, 'unavailable', null],
		[true, 'off', null],
		[true, 'held', null],
		[true, 'unavailable', UNAVAILABLE],
		[true, 'refused', REFUSED]
	] as [boolean, KeepAwakeState, string | null][])(
		'wanted %s in state %s shows %j',
		(wanted, state, note) => {
			expect(keepAwakeNote(wanted, state)).toBe(note);
		}
	);
});
