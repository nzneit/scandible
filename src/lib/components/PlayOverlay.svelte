<script lang="ts">
	import Icon from './Icon.svelte';
	import SecondsSlider from './SecondsSlider.svelte';
	import ValueSlider from './ValueSlider.svelte';
	import { DWELL_RANGE, GAP_RANGE, SPEED_RANGE } from '$lib/types';
	import { speedText, speedValuetext } from '$lib/speed';

	interface PlayOverlayProps {
		mode: 'scroll' | 'step';
		visible: boolean;
		playing: boolean;
		position: { index: number; count: number }; // Step
		dwell: number; // $bindable, ms
		gap: number; // $bindable, ms
		speed: number; // $bindable, px/s
		note: string | null; // the keep-awake note's text, or null
		onToggle: () => void;
		onPrev: () => void;
		onNext: () => void;
		onRestart: () => void;
		onBack: () => void;
		onDwell: (ms: number) => void; // calls the engine, as today
		onGap: (ms: number) => void;
		onSpeed: (pxPerSec: number) => void;
		onfocusin: () => void;
		onfocusout: () => void;
	}

	/** The overlay's icons on Icon's 24 px grid: the mockup's shapes, redrawn at its stroke width. */
	const ICON = {
		play: 'M7 4v16l13-8z',
		pause: ['M7 5h3v14H7z', 'M14 5h3v14h-3z'],
		prev: ['M19 20 9 12l10-8z', 'M5 19V5'],
		next: ['m5 4 10 8-10 8z', 'M19 5v14'],
		restart: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
		back: 'M19 12H5m7 7-7-7 7-7',
		moon: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z'
	};

	let {
		mode,
		visible,
		playing,
		position,
		dwell = $bindable(),
		gap = $bindable(),
		speed = $bindable(),
		note,
		onToggle,
		onPrev,
		onNext,
		onRestart,
		onBack,
		onDwell,
		onGap,
		onSpeed,
		onfocusin,
		onfocusout
	}: PlayOverlayProps = $props();

	const uid = $props.id();
	let root: HTMLDivElement | undefined = $state();

	// The note's region keeps the last note it was given while no note shows, so a note that
	// returns writes nothing and is not announced again; only a different text is.
	let last = '';
	const announced = $derived.by(() => {
		if (note !== null) last = note;
		return last;
	});

	/** True when a control in the overlay has keyboard focus, which keeps the overlay up. */
	export function hasKeyboardFocus(): boolean {
		return root?.querySelector(':focus-visible') != null;
	}
</script>

{#snippet iconButton(name: string, d: string | string[], filled: boolean, onclick: () => void)}
	<div class="tooltip tooltip-top" data-tip={name}>
		<button type="button" class="btn btn-lg btn-square" aria-label={name} {onclick}>
			<Icon {d} {filled} class="size-[22px]" />
		</button>
	</div>
{/snippet}

<div
	bind:this={root}
	class="overlay fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] flex flex-col gap-3 rounded-lg bg-neutral/85 p-3 text-neutral-content transition-opacity duration-300 motion-reduce:transition-none forced-colors:border md:inset-x-0 md:mx-auto md:w-max md:max-w-[calc(100%-2rem)] md:p-4"
	role="group"
	aria-label="Playback controls"
	style:opacity={visible ? null : 0}
	style:pointer-events={visible ? null : 'none'}
	{onfocusin}
	{onfocusout}
>
	<!-- Mounted for the overlay's life, so a note is announced as a change to an existing live
	     region; with no note it is visually hidden and keeps its last text (R1, R2). -->
	<p
		role="status"
		aria-label="Keep-awake status"
		class={['flex items-center gap-2 text-sm', note === null && 'sr-only']}
		style:opacity={note === null ? 0 : null}
	>
		<Icon d={ICON.moon} class="size-[22px] shrink-0" />{announced}
	</p>
	<div
		class={[
			'flex flex-col gap-3',
			mode === 'step' ? 'xl:flex-row xl:items-center' : 'md:flex-row md:items-center'
		]}
	>
		<div class="flex flex-wrap items-center gap-2 md:flex-nowrap">
			<button type="button" class="btn btn-lg me-auto md:me-0" onclick={onBack}>
				<Icon d={ICON.back} class="size-[22px]" />Back
			</button>
			{@render iconButton('Restart', ICON.restart, false, onRestart)}
			<div
				class={['flex gap-2', mode === 'step' && 'max-[25rem]:basis-full max-[25rem]:justify-end']}
			>
				{#if mode === 'step'}
					{@render iconButton('Prev', ICON.prev, false, onPrev)}
				{/if}
				{@render iconButton(
					playing ? 'Pause' : 'Play',
					playing ? ICON.pause : ICON.play,
					true,
					onToggle
				)}
				{#if mode === 'step'}
					{@render iconButton('Next', ICON.next, false, onNext)}
				{/if}
			</div>
			{#if mode === 'step'}
				<span class="sr-only tabular-nums md:not-sr-only"
					>{position.index + 1} / {position.count}</span
				>
			{/if}
		</div>
		{#if mode === 'step'}
			<div class="flex flex-col gap-3 md:flex-row md:items-center">
				<div role="group" aria-labelledby="{uid}-dwell" class="flex items-center gap-2">
					<span id="{uid}-dwell">Dwell</span>
					<SecondsSlider
						bind:value={dwell}
						range={DWELL_RANGE}
						label="Dwell"
						rangeAriaLabel="Dwell"
						rangeClass="ctl-dwell"
						secondsClass="ctl-dwell-seconds"
						size="lg"
						onchange={onDwell}
					/>
				</div>
				<div role="group" aria-labelledby="{uid}-gap" class="flex items-center gap-2">
					<span id="{uid}-gap">Gap</span>
					<SecondsSlider
						bind:value={gap}
						range={GAP_RANGE}
						label="Gap"
						rangeAriaLabel="Gap"
						rangeClass="ctl-gap"
						secondsClass="ctl-gap-seconds"
						size="lg"
						onchange={onGap}
					/>
				</div>
			</div>
		{:else}
			<ValueSlider
				variant="overlay"
				label="Speed"
				bind:value={speed}
				min={SPEED_RANGE.min}
				max={SPEED_RANGE.max}
				step={SPEED_RANGE.step}
				text={speedText}
				valuetext={speedValuetext}
				oninput={onSpeed}
			/>
		{/if}
	</div>
</div>

<style>
	/* daisyUI's focus outline is base-content, 2.66:1 on the overlay; neutral-content is 6.38:1.
	   The seconds fields belong to SecondsSlider, a child component, hence :global. */
	.overlay :global(:focus-visible) {
		outline-color: var(--color-neutral-content);
	}
</style>
