import { buildEntry, tokenize } from './codes';
import { FORMAT_BY_ID, eccChoice, type FormatId } from './formats';
import type { CodeEntry } from './types';

export interface Row {
	payload: string; // the field's text as typed; may contain newlines
	format: FormatId;
	ecc: string; // this row's level; '' = the format's default, canonical like Settings.ecc
}

export interface TextConversion {
	text: string; // non-blank tokens joined by '\n'
	format: FormatId; // first non-blank row's format, else fallback.format
	ecc: string; // that row's ecc, else fallback.ecc
	loses: { formats: number; levels: number; splits: number }; // rows affected; all 0 = lossless
}

/** CRLF and lone CR → LF, then both ends trimmed. '' marks a blank row. */
export function rowToken(payload: string): string {
	return payload.replace(/\r\n?/g, '\n').trim();
}

/** One entry for a non-blank row, through the override layer; null for a blank row. */
export function rowEntry(row: Row): CodeEntry | null {
	const token = rowToken(row.payload);
	if (token === '') return null;
	return buildEntry(token, row.format, { format: row.format, ecc: '' }, { ecc: row.ecc });
}

/** rowEntry over the rows in order, blank rows dropped. */
export function rowEntries(rows: Row[]): CodeEntry[] {
	return rows.flatMap((row) => rowEntry(row) ?? []);
}

/** The 1-based editor number of each non-blank row, parallel to rowEntries(rows). */
export function rowNumbers(rows: Row[]): number[] {
	return rows.flatMap((row, i) => (rowToken(row.payload) === '' ? [] : [i + 1]));
}

/** One row per token of the CR-normalized list, carrying the list's format and level. */
export function rowsFromText(text: string, format: FormatId, ecc: string): Row[] {
	return tokenize(text.replace(/\r\n?/g, '\n'), format).map((token) => ({
		payload: token,
		format,
		ecc
	}));
}

/** The Plain text form of the rows and what it would lose. */
export function textFromRows(
	rows: Row[],
	fallback: { format: FormatId; ecc: string }
): TextConversion {
	const live = rows
		.map((row) => ({ row, token: rowToken(row.payload) }))
		.filter(({ token }) => token !== '');
	const format = live.length > 0 ? live[0].row.format : fallback.format;
	const ecc = live.length > 0 ? live[0].row.ecc : fallback.ecc;
	const loses = { formats: 0, levels: 0, splits: 0 };
	for (const { row, token } of live) {
		if (row.format !== format) loses.formats++;
		else if (row.ecc !== ecc) loses.levels++;
		const pieces = tokenize(token, format);
		if (pieces.length !== 1 || pieces[0] !== token) loses.splits++;
	}
	return { text: live.map(({ token }) => token).join('\n'), format, ecc, loses };
}

/** The loss note's text, naming the result's format and level; '' when every count is 0. */
export function describeLoss(
	loses: TextConversion['loses'],
	result: { format: FormatId; ecc: string }
): string {
	if (loses.formats === 0 && loses.levels === 0 && loses.splits === 0) return '';
	const d = FORMAT_BY_ID.get(result.format);
	const count = (k: number, one: string) => `${k} ${one}${k === 1 ? '' : 's'}`;
	const clauses: string[] = [];
	if (loses.formats > 0) clauses.push(`drops the format of ${count(loses.formats, 'row')}`);
	if (loses.levels > 0) {
		const lead = clauses.length > 0 ? '' : 'drops ';
		clauses.push(`${lead}the level of ${count(loses.levels, 'row')}`);
	}
	if (loses.splits > 0) {
		const tail = d?.numeric ? ' or commas' : '';
		clauses.push(`cuts ${count(loses.splits, 'payload')} at line breaks${tail}`);
	}
	const joined =
		clauses.length === 3
			? `${clauses[0]}, ${clauses[1]}, and ${clauses[2]}`
			: clauses.join(' and ');
	let result3 = `Every code will take the format of the first code, ${d?.label ?? result.format}`;
	if (!d?.ecc) result3 += '.';
	else if (result.ecc !== '') result3 += `, and ${eccChoice(d, result.ecc)?.label}.`;
	else result3 += ", and the format's default level.";
	return `Plain text keeps one format and one error-correction level for the whole list, and one code per line. Switching now ${joined}. ${result3}`;
}
