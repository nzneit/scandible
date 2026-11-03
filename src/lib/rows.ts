import { buildEntry, tokenize } from './codes';
import { FORMAT_BY_ID, eccChoice, isGs1, type FormatId } from './formats';
import type { CodeEntry } from './types';

export interface Row {
	payload: string; // the field's text as typed; may contain newlines
	format: FormatId;
	ecc: string; // this row's level; '' = the format's default, canonical like Settings.ecc
	lax: boolean; // render if invalid; canonical like Settings.lax: true only on a GS1 format
}

export interface TextConversion {
	text: string; // non-blank tokens joined by '\n'
	format: FormatId; // first non-blank row's format, else fallback.format
	ecc: string; // that row's ecc, else fallback.ecc
	lax: boolean; // that row's lax, else fallback.lax
	loses: { formats: number; levels: number; splits: number; validation: number }; // rows affected; all 0 = lossless
}

/** CRLF and lone CR → LF, then both ends trimmed. '' marks a blank row. */
export function rowToken(payload: string): string {
	return payload.replace(/\r\n?/g, '\n').trim();
}

/** One entry for a non-blank row, through the override layer; null for a blank row. */
export function rowEntry(row: Row): CodeEntry | null {
	const token = rowToken(row.payload);
	if (token === '') return null;
	return buildEntry(
		token,
		row.format,
		{ format: row.format, ecc: '', lax: false },
		{
			ecc: row.ecc,
			lax: row.lax
		}
	);
}

/** rowEntry over the rows in order, blank rows dropped. */
export function rowEntries(rows: Row[]): CodeEntry[] {
	return rows.flatMap((row) => rowEntry(row) ?? []);
}

/** The 1-based editor number of each non-blank row, parallel to rowEntries(rows). */
export function rowNumbers(rows: Row[]): number[] {
	return rows.flatMap((row, i) => (rowToken(row.payload) === '' ? [] : [i + 1]));
}

/** One row per token of the CR-normalized list, carrying the list's format, level and render-if-invalid flag. */
export function rowsFromText(text: string, format: FormatId, ecc: string, lax: boolean): Row[] {
	return tokenize(text.replace(/\r\n?/g, '\n'), format).map((token) => ({
		payload: token,
		format,
		ecc,
		lax
	}));
}

/** The Plain text form of the rows and what it would lose. */
export function textFromRows(
	rows: Row[],
	fallback: { format: FormatId; ecc: string; lax: boolean }
): TextConversion {
	const live = rows
		.map((row) => ({ row, token: rowToken(row.payload) }))
		.filter(({ token }) => token !== '');
	const format = live.length > 0 ? live[0].row.format : fallback.format;
	const ecc = live.length > 0 ? live[0].row.ecc : fallback.ecc;
	const lax = live.length > 0 ? live[0].row.lax : fallback.lax;
	const loses = { formats: 0, levels: 0, splits: 0, validation: 0 };
	for (const { row, token } of live) {
		if (row.format !== format) loses.formats++;
		else if (row.ecc !== ecc) loses.levels++;
		else if (row.lax !== lax) loses.validation++;
		const pieces = tokenize(token, format);
		if (pieces.length !== 1 || pieces[0] !== token) loses.splits++;
	}
	return { text: live.map(({ token }) => token).join('\n'), format, ecc, lax, loses };
}

/** The loss note's text, naming the result's format, level and (for GS1) validation setting;
 *  '' when every count is 0. */
export function describeLoss(
	loses: TextConversion['loses'],
	result: { format: FormatId; ecc: string; lax: boolean }
): string {
	if (loses.formats === 0 && loses.levels === 0 && loses.splits === 0 && loses.validation === 0)
		return '';
	const d = FORMAT_BY_ID.get(result.format);
	const count = (k: number, one: string) => `${k} ${one}${k === 1 ? '' : 's'}`;
	const clauses: string[] = [];
	const drop = (k: number, what: string) => {
		if (k > 0)
			clauses.push(`${clauses.length > 0 ? '' : 'drops '}the ${what} of ${count(k, 'row')}`);
	};
	drop(loses.formats, 'format');
	drop(loses.levels, 'level');
	drop(loses.validation, 'render-if-invalid setting');
	if (loses.splits > 0) {
		const tail = d?.numeric ? ' or commas' : '';
		clauses.push(`cuts ${count(loses.splits, 'payload')} at line breaks${tail}`);
	}
	const joined =
		clauses.length <= 2
			? clauses.join(' and ')
			: `${clauses.slice(0, -1).join(', ')}, and ${clauses[clauses.length - 1]}`;
	const first =
		loses.validation > 0
			? 'Plain text keeps one format, one error-correction level and one render-if-invalid setting for the whole list, and one code per line.'
			: 'Plain text keeps one format and one error-correction level for the whole list, and one code per line.';
	let resultSentence = `Every code will take the format of the first code, ${d?.label ?? result.format}`;
	if (d?.ecc) {
		resultSentence +=
			result.ecc !== ''
				? `, and ${eccChoice(d, result.ecc)?.label}`
				: ", and the format's default level";
	}
	if (d && isGs1(d))
		resultSentence += `, with invalid GS1 data ${result.lax ? 'rendered' : 'skipped'}`;
	return `${first} Switching now ${joined}. ${resultSentence}.`;
}
