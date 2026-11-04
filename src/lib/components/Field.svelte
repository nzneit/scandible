<script lang="ts">
	import type { Snippet } from 'svelte';

	interface FieldProps {
		label: string;
		class?: string;
		children: Snippet;
	}

	let { label, class: className, children }: FieldProps = $props();
</script>

<label class={['field flex flex-col items-start gap-1', className]}
	>{label}{@render children()}</label
>
