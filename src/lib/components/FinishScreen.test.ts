import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import FinishScreen from './FinishScreen.svelte';
import type { FinishedRun } from '$lib/finish';

const SCROLL: FinishedRun = { mode: 'scroll', count: 5, seconds: 9.5 };
const STEP: FinishedRun = {
	mode: 'step',
	summary: {
		count: 5,
		seconds: 9.51,
		frameMs: 15.625,
		stalls: 2,
		dwell: { first: 1000, last: 1750, changed: true },
		gap: { first: 0, last: 170, changed: true }
	}
};

function mount(run: FinishedRun) {
	const onBack = vi.fn();
	const onRestart = vi.fn();
	render(FinishScreen, { props: { run, onBack, onRestart } });
	return { onBack, onRestart };
}

// A <dt> gets no accessible name from its content, so read the text of each one.
function texts(role: 'term' | 'definition', expected: string[]) {
	const found = screen.getAllByRole(role);
	expect(found).toHaveLength(expected.length);
	expected.forEach((text, i) => expect(found[i]).toHaveTextContent(text));
}

describe('FinishScreen', () => {
	it("is a region named by its heading, the page's only heading, which takes focus", () => {
		mount(SCROLL);
		const region = screen.getByRole('region', { name: 'Run finished' });
		const heading = within(region).getByRole('heading', { level: 1, name: 'Run finished' });
		expect(heading).toHaveFocus();
		expect(screen.getAllByRole('heading')).toHaveLength(1);
	});

	it('lists a Scroll run as one list of terms and values', () => {
		mount(SCROLL);
		texts('term', ['Barcodes', 'Playback time']);
		texts('definition', ['5', '9.5 s']);
		expect(screen.queryByText('Dwell')).toBeNull();
	});

	it("lists a Step run's result, then its conditions, with what changed and the stalls", () => {
		mount(STEP);
		texts('term', ['Barcodes', 'Playback time', 'Dwell', 'Gap', 'Refresh rate']);
		texts('definition', [
			'5',
			'9.51 s',
			'1.75 s',
			'changed from 1.00 s',
			'0.17 s',
			'changed from 0.00 s',
			'64 Hz',
			'2 frames took over 100 ms'
		]);
		expect(screen.getByText('Dwell')).toBeInTheDocument();
	});

	it('puts Back before Restart after the stats, and calls each back', async () => {
		const { onBack, onRestart } = mount(STEP);
		const last = screen.getAllByRole('definition').at(-1)!;
		const back = screen.getByRole('button', { name: 'Back' });
		const restart = screen.getByRole('button', { name: 'Restart' });
		expect(last).toAppearBefore(back);
		expect(back).toAppearBefore(restart);
		await fireEvent.click(back);
		await fireEvent.click(restart);
		expect(onBack).toHaveBeenCalledTimes(1);
		expect(onRestart).toHaveBeenCalledTimes(1);
	});
});
