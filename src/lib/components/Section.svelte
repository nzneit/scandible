<script lang="ts">
	import type { Snippet } from 'svelte';

	interface SectionProps {
		title: string; // the visible <h2>, which names the section
		headingId?: string; // the <h2>'s id, for a control the heading also names
		class?: string;
		actions?: Snippet;
		children: Snippet;
	}

	const uid = $props.id();
	let { title, headingId, class: className, actions, children }: SectionProps = $props();
	const id = $derived(headingId ?? `${uid}-heading`);
</script>

<section
	aria-labelledby={id}
	class={['flex flex-col gap-3 rounded-box border border-base-300 p-4', className]}
>
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h2 {id} class="text-lg font-semibold">{title}</h2>
		{@render actions?.()}
	</div>
	{@render children()}
</section>
