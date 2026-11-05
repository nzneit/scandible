<script lang="ts">
	import { DWELL_RANGE, GAP_RANGE, SPEED_RANGE, type PlaybackMode } from '$lib/types';
	import type { Setup } from '$lib/setup.svelte';
	import Section from './Section.svelte';
	import Segmented from './Segmented.svelte';
	import ValueSlider from './ValueSlider.svelte';
	import Field from './Field.svelte';
	import Note from './Note.svelte';
	import { speedText, speedValuetext } from '$lib/speed';
	import SecondsSlider from './SecondsSlider.svelte';

	interface SettingsPaneProps {
		setup: Setup;
	}

	let { setup }: SettingsPaneProps = $props();
	const uid = $props.id();

	const MODES: { value: PlaybackMode; text: string }[] = [
		{ value: 'scroll', text: 'Scroll' },
		{ value: 'step', text: 'Step' }
	];
	const degrees = (v: number) => `± ${v}°`;
	const degreesText = (v: number) => (v === 1 ? '1 degree' : `${v} degrees`);
</script>

<!-- Sticky only where the tallest pane fits the window: Step mode with both warnings measured
     924 px at 900 px wide; with the 24 px top offset and the 56 px bar, ceil(1004 / 16) = 63 rem. -->
<div
	class="settings-pane flex flex-col gap-6 self-start min-[900px]:[@media(min-height:63rem)]:sticky min-[900px]:[@media(min-height:63rem)]:top-6"
>
	<Section title="Playback">
		<Segmented
			name="{uid}-mode"
			label="Playback mode"
			options={MODES}
			value={setup.mode}
			onchange={(next) => (setup.mode = next)}
		/>
		{#if setup.mode === 'step'}
			<Field label="Dwell">
				<SecondsSlider
					bind:value={setup.dwellMs}
					range={DWELL_RANGE}
					label="Dwell"
					rangeAriaLabel="Dwell"
					rangeClass="dwell-input"
					secondsClass="dwell-seconds"
				/>
			</Field>
			{#if setup.dwellMs < 330}
				<Note class="flash-note" tone="warning">
					Dwells under 0.33 s flash the screen more than three times a second. Do not use them near
					anyone sensitive to flashing lights.
				</Note>
			{/if}
			<Field label="Gap">
				<SecondsSlider
					bind:value={setup.gapMs}
					range={GAP_RANGE}
					label="Gap"
					rangeAriaLabel="Gap"
					rangeClass="gap-input"
					secondsClass="gap-seconds"
				/>
			</Field>
			{#if setup.gapMs < 1000 && setup.dupPairs.length > 0}
				<Note class="dup-hint" tone="warning">{setup.dupHint}</Note>
			{/if}
		{:else}
			<ValueSlider
				label="Speed"
				bind:value={setup.speedPxPerSec}
				min={SPEED_RANGE.min}
				max={SPEED_RANGE.max}
				step={SPEED_RANGE.step}
				text={speedText}
				valuetext={speedValuetext}
			/>
		{/if}
		<Field label="Loop">
			<input type="checkbox" class="loop-input toggle toggle-sm" bind:checked={setup.loop} />
		</Field>
	</Section>
	<Section title="Distortion">
		<Field label="Random rotation">
			<input type="checkbox" class="rotate-input toggle toggle-sm" bind:checked={setup.rotate} />
		</Field>
		<ValueSlider
			label="Maximum rotation"
			bind:value={setup.rotateMaxDeg}
			min={1}
			max={30}
			step={1}
			disabled={!setup.rotate}
			text={degrees}
			valuetext={degreesText}
		/>
		<Field label="Random skew">
			<input type="checkbox" class="skew-input toggle toggle-sm" bind:checked={setup.skew} />
		</Field>
		<ValueSlider
			label="Maximum skew"
			bind:value={setup.skewMaxDeg}
			min={1}
			max={30}
			step={1}
			disabled={!setup.skew}
			text={degrees}
			valuetext={degreesText}
		/>
	</Section>
</div>
