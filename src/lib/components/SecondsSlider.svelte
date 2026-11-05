<script lang="ts">
	import { formatSeconds, parseSeconds } from '$lib/seconds';

	interface SecondsSliderProps {
		value: number; // $bindable, milliseconds
		range: { min: number; max: number; step: number }; // DWELL_RANGE or GAP_RANGE
		label: string; // 'Dwell' or 'Gap'; names the seconds field "<label> in seconds"
		rangeAriaLabel?: string; // 'Dwell' | 'Gap'; set at every call site, setup page and overlay
		rangeClass: string; // 'dwell-input' | 'gap-input' | 'ctl-dwell' | 'ctl-gap'
		secondsClass: string; // 'dwell-seconds' | 'gap-seconds' | 'ctl-dwell-seconds' | 'ctl-gap-seconds'
		size?: 'sm' | 'lg'; // default 'sm' (setup page); 'lg' (48 px) in the overlay
		onchange?: (ms: number) => void; // the overlay passes step.setDwell / step.setGap
	}

	const SIZES = {
		sm: {
			range: 'range range-sm w-32',
			input: 'input input-sm w-[4.5rem] text-base-content',
			unit: 'gap-1'
		},
		lg: {
			range: 'range range-lg h-12 min-w-24 flex-1 md:w-40 md:flex-none',
			input: 'input input-lg w-20 text-base-content',
			unit: 'gap-2'
		}
	};

	let {
		value = $bindable(),
		range,
		label,
		rangeAriaLabel,
		rangeClass,
		secondsClass,
		size = 'sm',
		onchange
	}: SecondsSliderProps = $props();

	/** A number is snapped, clamped, stored and reported; anything else is ignored. */
	function onSeconds(e: Event & { currentTarget: HTMLInputElement }): void {
		const ms = parseSeconds(e.currentTarget.value, range);
		if (ms !== null) {
			value = ms;
			onchange?.(ms);
		}
		e.currentTarget.value = (value / 1000).toFixed(2);
	}
</script>

<input
	type="range"
	class={[SIZES[size].range, rangeClass]}
	min={range.min}
	max={range.max}
	step={range.step}
	aria-label={rangeAriaLabel}
	aria-valuetext={formatSeconds(value)}
	bind:value
	oninput={(e) => onchange?.(Number(e.currentTarget.value))}
/>
<span class={['seconds flex items-center', SIZES[size].unit]}>
	<input
		type="number"
		class={[SIZES[size].input, secondsClass]}
		inputmode="decimal"
		min={range.min / 1000}
		max={range.max / 1000}
		step="0.01"
		aria-label="{label} in seconds"
		value={(value / 1000).toFixed(2)}
		onchange={onSeconds}
	/>
	s
</span>
