<script lang="ts">
	import { FORMAT_GROUPS, type FormatId } from '#lib/formats.ts';

	interface FormatSelectProps {
		value: FormatId;
		class: string;
		'aria-label'?: string;
	}

	let {
		value = $bindable(),
		class: className,
		'aria-label': ariaLabel
	}: FormatSelectProps = $props();
</script>

<select class={['select select-sm w-auto', className]} aria-label={ariaLabel} bind:value>
	{#each FORMAT_GROUPS as { group, formats } (group)}
		<optgroup label={group}>
			{#each formats as f (f.id)}
				<option value={f.id}>{f.label}</option>
			{/each}
		</optgroup>
	{/each}
</select>
