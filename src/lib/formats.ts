/** Format registry (Approach C′): one descriptor per JsBarcode-documented format.
 *  Descriptors are data-only today; the optional hooks are the extension seam for
 *  future format-specific features (EAN flat, CODE39 mod43, …). CODE39 must never
 *  define `normalize` — the encoder's own uppercasing is what the UI's
 *  `raw ✓ → encoded` row exists to surface. */

export type FormatId =
	| 'code128'
	| 'code128a'
	| 'code128b'
	| 'code128c'
	| 'ean13'
	| 'ean8'
	| 'ean5'
	| 'ean2'
	| 'upc'
	| 'upce'
	| 'code39'
	| 'itf'
	| 'itf14'
	| 'msi'
	| 'msi10'
	| 'msi11'
	| 'msi1010'
	| 'msi1110'
	| 'pharmacode'
	| 'codabar'
	| 'code93';

export interface FormatDescriptor {
	id: FormatId;
	jsbarcodeFormat: string; // key in JsBarcode's internal registry, e.g. 'CODE128A'
	label: string; // dropdown text
	group: string; // optgroup label, README-style
	numeric: boolean; // true → comma-split + whitespace-strip cleanup default
	normalize?: (token: string) => string; // per-token cleanup override (see parseCodeList)
	renderOptions?: () => Record<string, unknown>; // extra JsBarcode options
}

export const DEFAULT_FORMAT: FormatId = 'upc';

export const FORMATS: readonly FormatDescriptor[] = [
	{
		id: 'code128',
		jsbarcodeFormat: 'CODE128',
		label: 'CODE128 (auto)',
		group: 'CODE128',
		numeric: false
	},
	{
		id: 'code128a',
		jsbarcodeFormat: 'CODE128A',
		label: 'CODE128 A (force mode)',
		group: 'CODE128',
		numeric: false
	},
	{
		id: 'code128b',
		jsbarcodeFormat: 'CODE128B',
		label: 'CODE128 B (force mode)',
		group: 'CODE128',
		numeric: false
	},
	{
		id: 'code128c',
		jsbarcodeFormat: 'CODE128C',
		label: 'CODE128 C (force mode)',
		group: 'CODE128',
		numeric: false
	},
	{ id: 'ean13', jsbarcodeFormat: 'EAN13', label: 'EAN-13', group: 'EAN / UPC', numeric: true },
	{ id: 'ean8', jsbarcodeFormat: 'EAN8', label: 'EAN-8', group: 'EAN / UPC', numeric: true },
	{
		id: 'ean5',
		jsbarcodeFormat: 'EAN5',
		label: 'EAN-5 (add-on)',
		group: 'EAN / UPC',
		numeric: true
	},
	{
		id: 'ean2',
		jsbarcodeFormat: 'EAN2',
		label: 'EAN-2 (add-on)',
		group: 'EAN / UPC',
		numeric: true
	},
	{ id: 'upc', jsbarcodeFormat: 'UPC', label: 'UPC-A', group: 'EAN / UPC', numeric: true },
	{ id: 'upce', jsbarcodeFormat: 'UPCE', label: 'UPC-E', group: 'EAN / UPC', numeric: true },
	{ id: 'code39', jsbarcodeFormat: 'CODE39', label: 'CODE39', group: 'CODE39', numeric: false },
	{ id: 'itf', jsbarcodeFormat: 'ITF', label: 'ITF', group: 'ITF', numeric: true },
	{ id: 'itf14', jsbarcodeFormat: 'ITF14', label: 'ITF-14', group: 'ITF', numeric: true },
	{ id: 'msi', jsbarcodeFormat: 'MSI', label: 'MSI', group: 'MSI', numeric: true },
	{ id: 'msi10', jsbarcodeFormat: 'MSI10', label: 'MSI10', group: 'MSI', numeric: true },
	{ id: 'msi11', jsbarcodeFormat: 'MSI11', label: 'MSI11', group: 'MSI', numeric: true },
	{ id: 'msi1010', jsbarcodeFormat: 'MSI1010', label: 'MSI1010', group: 'MSI', numeric: true },
	{ id: 'msi1110', jsbarcodeFormat: 'MSI1110', label: 'MSI1110', group: 'MSI', numeric: true },
	{
		id: 'pharmacode',
		jsbarcodeFormat: 'pharmacode',
		label: 'Pharmacode',
		group: 'Other',
		numeric: true
	},
	{ id: 'codabar', jsbarcodeFormat: 'codabar', label: 'Codabar', group: 'Other', numeric: false },
	{ id: 'code93', jsbarcodeFormat: 'CODE93', label: 'CODE93', group: 'Other', numeric: false }
];

export const FORMAT_BY_ID: ReadonlyMap<FormatId, FormatDescriptor> = new Map(
	FORMATS.map((f) => [f.id, f])
);

/** Groups in FORMATS (README) order, for the setup page's <optgroup> rendering. */
export const FORMAT_GROUPS: readonly { group: string; formats: readonly FormatDescriptor[] }[] =
	FORMATS.reduce<{ group: string; formats: FormatDescriptor[] }[]>((groups, f) => {
		const last = groups[groups.length - 1];
		if (last && last.group === f.group) last.formats.push(f);
		else groups.push({ group: f.group, formats: [f] });
		return groups;
	}, []);

export function isFormatId(value: string): value is FormatId {
	return FORMAT_BY_ID.has(value as FormatId);
}
