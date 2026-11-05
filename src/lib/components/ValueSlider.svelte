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
	}

	let {
		label,
		value = $bindable(),
		min,
		max,
		step,
		disabled = false,
		text,
		valuetext
	}: ValueSliderProps = $props();
</script>

<div class="flex items-end gap-2">
	<label class="flex flex-col items-start gap-1"
		>{label}<input
			type="range"
			class="range range-sm w-32"
			{min}
			{max}
			{step}
			{disabled}
			aria-valuetext={valuetext(value)}
			bind:value
		/></label
	>
	<span class="text-sm tabular-nums" aria-hidden="true">{text(value)}</span>
</div>
