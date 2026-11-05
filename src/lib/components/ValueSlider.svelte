<script lang="ts">
	interface ValueSliderProps {
		label: string;
		value: number; // $bindable
		min: number;
		max: number;
		step: number;
		disabled?: boolean;
		text: (value: number) => string; // the visible value, e.g. '60 px/s'
		valuetext: (value: number) => string; // aria-valuetext, e.g. '60 pixels per second'
		oninput?: (value: number) => void; // the moved value
		variant?: 'setup' | 'overlay'; // default 'setup'
	}

	let {
		label,
		value = $bindable(),
		min,
		max,
		step,
		disabled = false,
		text,
		valuetext,
		oninput,
		variant = 'setup'
	}: ValueSliderProps = $props();

	const STYLES = {
		setup: {
			row: 'flex items-end gap-2',
			label: 'flex flex-col items-start gap-1',
			range: 'range range-sm w-32',
			value: 'text-sm tabular-nums'
		},
		overlay: {
			row: 'flex items-center gap-2',
			label: 'flex flex-1 items-center gap-2 md:flex-none',
			range: 'range range-lg h-12 min-w-24 flex-1 md:w-40 md:flex-none',
			value: 'tabular-nums whitespace-nowrap'
		}
	};
</script>

<div class={STYLES[variant].row}>
	<label class={STYLES[variant].label}
		>{label}<input
			type="range"
			class={STYLES[variant].range}
			{min}
			{max}
			{step}
			{disabled}
			aria-valuetext={valuetext(value)}
			bind:value
			oninput={(e) => oninput?.(Number(e.currentTarget.value))}
		/></label
	>
	<span class={STYLES[variant].value} aria-hidden="true">{text(value)}</span>
</div>
