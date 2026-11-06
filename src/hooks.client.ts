import type { ClientInit } from '@sveltejs/kit/hooks';

/**
 * The SvelteKit router runs decodeURIComponent on the URL fragment during
 * navigation, so a bare `%` from a hand-edited or mangled share link would
 * throw a URIError before the app starts. Only a fragment that decodeURIComponent
 * rejects is rewritten; well-formed fragments, including plain anchors, are left alone.
 * replaceState adds no history entry and fires no hashchange.
 */
export const init: ClientInit = () => {
	if (location.hash.length <= 1) return;
	try {
		decodeURIComponent(location.hash.slice(1));
		return;
	} catch {
		/* fall through to the repair */
	}
	const repaired = '#' + new URLSearchParams(location.hash.slice(1)).toString();
	if (repaired !== location.hash) {
		history.replaceState(history.state, '', location.pathname + location.search + repaired);
	}
};
