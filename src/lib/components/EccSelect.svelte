<script lang="ts">
	import type { EccOption } from '$lib/formats';

	interface EccSelectProps {
		option: EccOption;
		value: string;
		class: string;
		'aria-label'?: string;
	}

	let {
		option,
		value = $bindable(),
		class: className,
		'aria-label': ariaLabel
	}: EccSelectProps = $props();
</script>

<select
	class={['select select-sm w-auto', className]}
	aria-label={ariaLabel}
	bind:value={
		() => value || option.defaultValue, (v) => (value = v === option.defaultValue ? '' : v)
	}
>
	{#each option.choices as c (c.value)}
		<option value={c.value}>{c.note ? `${c.label} (${c.note})` : c.label}</option>
	{/each}
</select>
