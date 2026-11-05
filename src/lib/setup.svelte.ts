import { parseCodeList } from '$lib/codes';
import {
	rowEntries,
	rowNumbers,
	rowsFromText,
	textFromRows,
	type Row,
	type TextConversion
} from '$lib/rows';
import { FORMAT_BY_ID, canonicalEcc, canonicalLax, isGs1, type FormatId } from '$lib/formats';
import { readCodesFile } from '$lib/fileInput';
import { decodeShareUrl, encodeRowsShareUrl, encodeShareUrl } from '$lib/shareUrl';
import { DEFAULT_SETTINGS, type CodeEntry, type PlaybackMode, type Settings } from '$lib/types';
import { duplicateNeighbours } from '$lib/duplicates';

export type Editor = 'text' | 'rows';
/** What selectEditor did: switched either way, opened the lossy note, or nothing. */
export type EditorSwitch = 'to-text' | 'to-rows' | 'pending' | 'unchanged';

function isLossless(c: TextConversion): boolean {
	return (
		c.loses.formats === 0 &&
		c.loses.levels === 0 &&
		c.loses.splits === 0 &&
		c.loses.validation === 0
	);
}

/** The setup page's state, derived values and actions. The page makes one from the decoded share
 *  URL; focus moves and the file input stay in the components. */
export class Setup {
	readonly seed: number;

	// Defaults only: the constructor sets the codes and settings from the link.
	text = $state('');
	editor: Editor = $state('text');
	rows: Row[] = $state([]);
	pending: TextConversion | null = $state(null);
	fileError = $state('');
	speedPxPerSec = $state(DEFAULT_SETTINGS.speedPxPerSec);
	loop = $state(DEFAULT_SETTINGS.loop);
	rotate = $state(DEFAULT_SETTINGS.rotate);
	rotateMaxDeg = $state(DEFAULT_SETTINGS.rotateMaxDeg);
	skew = $state(DEFAULT_SETTINGS.skew);
	skewMaxDeg = $state(DEFAULT_SETTINGS.skewMaxDeg);
	ecc = $state(DEFAULT_SETTINGS.ecc);
	lax = $state(DEFAULT_SETTINGS.lax);
	mode: PlaybackMode = $state(DEFAULT_SETTINGS.mode);
	dwellMs = $state(DEFAULT_SETTINGS.dwellMs);
	gapMs = $state(DEFAULT_SETTINGS.gapMs);
	#format: FormatId = $state(DEFAULT_SETTINGS.format);

	constructor(decoded: ReturnType<typeof decodeShareUrl>, seed: number) {
		const initial: Settings = { ...DEFAULT_SETTINGS, ...decoded.settings };
		this.seed = seed;
		this.text = decoded.codes.join('\n');
		this.editor = decoded.records ? 'rows' : 'text';
		this.rows = decoded.records ?? [];
		this.speedPxPerSec = initial.speedPxPerSec;
		this.loop = initial.loop;
		this.rotate = initial.rotate;
		this.rotateMaxDeg = initial.rotateMaxDeg;
		this.skew = initial.skew;
		this.skewMaxDeg = initial.skewMaxDeg;
		// The format first, then the level and the flag, so the link's values win.
		this.format = initial.format;
		this.ecc = initial.ecc;
		this.lax = initial.lax;
		this.mode = initial.mode;
		this.dwellMs = initial.dwellMs;
		this.gapMs = initial.gapMs;
	}

	get format(): FormatId {
		return this.#format;
	}

	// Keep `ecc` canonical across a format switch: drop a level the next format does not offer,
	// or one that is its default. Done in the binding's setter, never an $effect.
	set format(next: FormatId) {
		this.ecc = canonicalEcc(next, this.ecc);
		this.lax = canonicalLax(next, this.lax);
		this.#format = next;
	}

	descriptor = $derived(FORMAT_BY_ID.get(this.format));

	entries: CodeEntry[] = $derived(
		this.editor === 'rows'
			? rowEntries(this.rows)
			: parseCodeList(this.text, this.format, this.ecc, this.lax)
	);

	// Ready counts the valid entries, lenient ones included; skipped counts the invalid ones.
	counts = $derived.by(() => {
		const ready = this.entries.filter((e) => e.valid).length;
		return { ready, skipped: this.entries.length - ready };
	});

	canStart: boolean = $derived(this.counts.ready > 0);

	placeholder: string = $derived(
		isGs1(this.descriptor)
			? 'Paste GS1 element strings or scan data — one per line'
			: this.descriptor?.numeric
				? 'Paste codes — one per line, or comma-separated'
				: 'Paste codes — one per line'
	);

	// `.by`: a plain $derived initializer would read `seed` before the constructor sets it.
	settings: Settings = $derived.by(() => ({
		speedPxPerSec: this.speedPxPerSec,
		loop: this.loop,
		rotate: this.rotate,
		rotateMaxDeg: this.rotateMaxDeg,
		skew: this.skew,
		skewMaxDeg: this.skewMaxDeg,
		seed: this.seed,
		format: this.format,
		ecc: this.ecc,
		lax: this.lax,
		mode: this.mode,
		dwellMs: this.dwellMs,
		gapMs: this.gapMs
	}));

	shareHash: string = $derived(
		this.editor === 'rows'
			? encodeRowsShareUrl(this.rows, this.settings)
			: encodeShareUrl(
					this.entries.map((e) => e.raw),
					this.settings
				)
	);

	dupPairs: [number, number][] = $derived(
		duplicateNeighbours(
			this.entries.filter((e) => e.valid),
			this.loop
		)
	);

	dupHint: string = $derived.by(() => {
		if (this.dupPairs.length === 0) return '';
		const [a, b] = this.dupPairs[0];
		// In Per row the pair names the editor's rows, whose numbers count blank and invalid rows.
		let [first, second] = [a + 1, b + 1];
		if (this.editor === 'rows') {
			const valid = rowNumbers(this.rows).filter((_, k) => this.entries[k].valid);
			[first, second] = [valid[a], valid[b]];
		}
		const extra = this.dupPairs.length - 1;
		const more =
			extra === 0 ? '' : `, and ${extra} more neighboring ${extra === 1 ? 'pair' : 'pairs'}`;
		return (
			`Codes ${first} and ${second} are identical${more}. Many scanners skip a repeat read: ` +
			`set a gap of 1.00 s or more, or lower the scanner's reread delay.`
		);
	});

	/** A switch clears the file error. A lossy switch to Plain text only opens the note. */
	selectEditor(next: Editor): EditorSwitch {
		if (next === this.editor) return 'unchanged';
		this.fileError = '';
		if (next === 'rows') {
			this.rows = rowsFromText(this.text, this.format, this.ecc, this.lax);
			this.editor = 'rows';
			return 'to-rows';
		}
		const c = textFromRows(this.rows, { format: this.format, ecc: this.ecc, lax: this.lax });
		if (!isLossless(c)) {
			this.pending = c;
			return 'pending';
		}
		this.#apply(c);
		return 'to-text';
	}

	// The note shows the snapshot taken when Plain text was chosen; the rows may have changed
	// since. Switch only when the switch now does what the note says, else refresh the note.
	switchAnyway(): boolean {
		const c = textFromRows(this.rows, { format: this.format, ecc: this.ecc, lax: this.lax });
		const pending = this.pending;
		const same =
			pending !== null &&
			c.loses.formats === pending.loses.formats &&
			c.loses.levels === pending.loses.levels &&
			c.loses.splits === pending.loses.splits &&
			c.loses.validation === pending.loses.validation &&
			c.format === pending.format &&
			c.ecc === pending.ecc &&
			c.lax === pending.lax;
		if (isLossless(c) || same) {
			this.#apply(c);
			return true;
		}
		this.pending = c;
		return false;
	}

	/** Closes the note. The file error stays. */
	cancelSwitch(): void {
		this.pending = null;
	}

	/** Clears the file error first, so a repeated failure is announced again. The editor is read
	 *  once the file is read. */
	async loadFile(file: File): Promise<void> {
		this.fileError = '';
		try {
			const fileText = await readCodesFile(file);
			// Per row appends, so an upload never destroys a deck already built.
			if (this.editor === 'rows')
				this.rows = [...this.rows, ...rowsFromText(fileText, this.format, '', false)];
			else this.text = fileText;
			this.fileError = '';
		} catch {
			// Inline error only; the existing validation list is left untouched.
			this.fileError = 'Could not read file';
		}
	}

	// The format first, then the level and the flag, so the conversion's values win; they are
	// already canonical for `c.format`. The page moves the focus after a switch.
	#apply(c: TextConversion): void {
		this.text = c.text;
		this.format = c.format;
		this.ecc = c.ecc;
		this.lax = c.lax;
		this.editor = 'text';
		this.pending = null;
		this.fileError = '';
	}
}
