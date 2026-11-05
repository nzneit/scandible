<script lang="ts" generics="T extends string">
	interface SegmentedProps {
		name: string; // the radios' shared name, unique on the page
		label: string; // the group's accessible name
		options: readonly { value: T; text: string }[]; // each radio is named by its text
		value: T; // the checked option; the parent owns it
		onchange: (next: T) => void; // the parent takes the choice by changing `value`, or refuses
	}

	let { name, label, options, value, onchange }: SegmentedProps = $props();

	let inputs = $state<HTMLInputElement[]>([]);

	/** Focus the checked radio. */
	export function focus(): void {
		inputs[options.findIndex((option) => option.value === value)]?.focus();
	}

	function choose(next: T) {
		onchange(next);
		// A `checked={…}` attribute alone does not snap a refused choice back.
		options.forEach((option, i) => {
			inputs[i].checked = option.value === value;
		});
		if (value !== next) focus();
	}
</script>

<div role="radiogroup" aria-label={label} class="inline-flex">
	{#each options as option, i (option.value)}
		<label
			class="btn rounded-none border-base-content/55 btn-sm not-first:-ms-px first:rounded-s-field last:rounded-e-field has-checked:btn-primary has-checked:border-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-base-content"
		>
			<input
				type="radio"
				class="sr-only"
				{name}
				value={option.value}
				checked={option.value === value}
				bind:this={inputs[i]}
				onchange={() => choose(option.value)}
			/>{option.text}
		</label>
	{/each}
</div>
