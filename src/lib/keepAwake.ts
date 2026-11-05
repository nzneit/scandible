/**
 * Keeps the screen awake through a run with the Screen Wake Lock API (spec 3, Keep-awake).
 * It asks only on a visible tab, never retries in a loop, and reports each change of state once.
 */

export type KeepAwakeState = 'off' | 'held' | 'unavailable' | 'refused';

export interface KeepAwake {
	want(on: boolean): void;
	retry(): void; // the page calls it on a pointer press or a key press
	state(): KeepAwakeState;
	destroy(): void;
}

/** The shortest time between the start of one request and a `retry()` that asks again. */
const RETRY_MS = 1000;

export function createKeepAwake(options: {
	wakeLock: WakeLock | undefined; // navigator.wakeLock, or undefined
	doc: Document;
	onState: (state: KeepAwakeState) => void;
}): KeepAwake {
	const { wakeLock, doc, onState } = options;
	let wanted = false;
	let sentinel: WakeLockSentinel | null = null;
	let pending = false;
	let lastAsk = 0;
	let current: KeepAwakeState = 'off';
	let destroyed = false;

	function set(next: KeepAwakeState): void {
		if (destroyed || next === current) return;
		current = next;
		onState(next);
	}

	function ask(): void {
		if (!wakeLock) return set('unavailable');
		if (doc.visibilityState !== 'visible') return set('off');
		if (sentinel || pending) return;
		pending = true;
		lastAsk = Date.now();
		wakeLock.request('screen').then(granted, refused);
	}

	function granted(lock: WakeLockSentinel): void {
		pending = false;
		if (destroyed || !wanted) {
			void lock.release();
			return;
		}
		sentinel = lock;
		lock.addEventListener('release', onRelease);
		set('held');
	}

	/** A request rejected on a hidden tab is not a refusal: the tab's return asks again. */
	function refused(): void {
		pending = false;
		if (destroyed || !wanted) return;
		set(doc.visibilityState === 'visible' ? 'refused' : 'off');
	}

	/** The browser released the lock: the tab was hidden, or battery saver turned on. */
	function onRelease(event: Event): void {
		if (event.target !== sentinel) return;
		sentinel = null;
		set('off');
		if (wanted) ask();
	}

	function onVisibility(): void {
		if (wanted && !sentinel && !pending) ask();
	}

	/**
	 * Releases the held lock. Its listener goes first, so this release is not taken for the
	 * browser's.
	 */
	function letGo(): void {
		const lock = sentinel;
		if (!lock) return;
		sentinel = null;
		lock.removeEventListener('release', onRelease);
		void lock.release();
	}

	doc.addEventListener('visibilitychange', onVisibility);

	return {
		want(on) {
			if (destroyed || on === wanted) return;
			wanted = on;
			if (on) return ask();
			letGo();
			set('off');
		},
		retry() {
			if (destroyed || !wanted || current !== 'refused' || pending) return;
			if (Date.now() - lastAsk < RETRY_MS) return;
			ask();
		},
		state: () => current,
		destroy() {
			if (destroyed) return;
			doc.removeEventListener('visibilitychange', onVisibility);
			letGo();
			set('off');
			destroyed = true;
		}
	};
}

/** The overlay's note for each failing state (spec, Copy). */
export const KEEP_AWAKE_NOTE: { readonly unavailable: string; readonly refused: string } = {
	unavailable: "This browser can't keep the screen awake. The screen may turn off during the run.",
	refused:
		'Keep-awake was blocked, perhaps by battery saver. The screen may turn off during the run.'
};

/** The note to show: the state's text while keep-awake is wanted and fails, else null. */
export function keepAwakeNote(wanted: boolean, state: KeepAwakeState): string | null {
	if (!wanted) return null;
	return state === 'unavailable' || state === 'refused' ? KEEP_AWAKE_NOTE[state] : null;
}
