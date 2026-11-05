<script lang="ts">
	import { onMount } from 'svelte';
	import { finishStats, type FinishedRun, type Stat } from '$lib/finish';

	interface Props {
		run: FinishedRun;
		onBack: () => void;
		onRestart: () => void;
	}

	let { run, onBack, onRestart }: Props = $props();

	const uid = $props.id();
	const stats = $derived(finishStats(run));
	let heading: HTMLHeadingElement | undefined = $state();

	onMount(() => heading?.focus());
</script>

{#snippet tier(items: Stat[], valueClass: string)}
	<dl class="stats max-w-full border border-base-300">
		{#each items as stat (stat.title)}
			<div class="stat max-[25rem]:px-3">
				<dt class="stat-title text-sm whitespace-normal">{stat.title}</dt>
				<dd class={['stat-value', valueClass]}>{stat.value}</dd>
				{#if stat.desc}
					<dd class="stat-desc text-sm whitespace-normal">{stat.desc}</dd>
				{/if}
			</div>
		{/each}
	</dl>
{/snippet}

<section
	class="finish-screen fixed inset-0 flex overflow-y-auto bg-base-100 p-4"
	aria-labelledby="{uid}-heading"
>
	<div class="m-auto flex flex-col items-center gap-6">
		<h1 id="{uid}-heading" tabindex="-1" class="text-2xl font-semibold" bind:this={heading}>
			Run finished
		</h1>
		{@render tier(stats.result, 'text-4xl max-[25rem]:text-3xl')}
		{#if stats.conditions.length > 0}
			{@render tier(stats.conditions, 'text-2xl max-[25rem]:text-xl')}
		{/if}
		<div class="flex gap-3">
			<button type="button" class="btn btn-lg" onclick={onBack}>Back</button>
			<button type="button" class="btn btn-lg btn-primary" onclick={onRestart}>Restart</button>
		</div>
	</div>
</section>
