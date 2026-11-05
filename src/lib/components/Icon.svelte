<script lang="ts">
	interface IconProps {
		d: string | string[]; // one <path> per entry
		filled?: boolean; // fill="currentColor"; default fill="none"
		class?: string; // default 'size-4'
	}

	let { d, filled = false, class: className = 'size-4' }: IconProps = $props();
	// The <svg> spread keeps the attribute order of the row editor's old icons byte for byte (plain
	// attributes put class and fill last and fail Icon test 1); the each block is keyed by index
	// because a path string can repeat.
	const paths = $derived(typeof d === 'string' ? [d] : d);
</script>

<svg
	{...{
		'aria-hidden': 'true',
		viewBox: '0 0 24 24',
		class: className,
		fill: filled ? 'currentColor' : 'none',
		stroke: 'currentColor',
		'stroke-width': '2',
		'stroke-linecap': 'round',
		'stroke-linejoin': 'round'
	}}
	>{#each paths as p, i (i)}<path d={p} />{/each}</svg
>
