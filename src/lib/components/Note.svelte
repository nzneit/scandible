<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface NoteProps extends Omit<HTMLAttributes<HTMLParagraphElement>, 'class' | 'children'> {
		tone?: 'info' | 'warning' | 'error';
		class: string;
		children: Snippet;
	}

	const TONES = { info: 'text-base-content/70', warning: 'text-warning', error: 'text-error' };

	let { tone = 'info', class: className, children, ...rest }: NoteProps = $props();
</script>

<p {...rest} class={[TONES[tone], className]}>{@render children()}</p>
