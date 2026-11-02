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
	| 'code93'
	| 'qr'
	| 'datamatrix'
	| 'pdf417'
	| 'aztec';

export interface EccChoice {
	value: string; // stored in Settings.ecc (see _Entries, options and facts_) and the `ecc` URL param
	label: string; // short; used in the validation row: "too long for QR Code (level H)"
	note?: string; // appended to the <option> text in parentheses
}

export interface EccOption {
	choices: readonly EccChoice[];
	defaultValue: string; // one of choices[].value
}

interface DescriptorBase {
	id: FormatId;
	label: string; // dropdown text
	group: string; // optgroup label
	numeric: boolean; // true → comma-split + whitespace-strip cleanup default
	normalize?: (token: string) => string;
	ecc?: EccOption; // present only when the symbology offers a choice; no jsbarcode row sets it.
	// Lives on the base so `d.ecc` reads on the union without narrowing.
}

export interface JsBarcodeDescriptor extends DescriptorBase {
	engine: 'jsbarcode';
	jsbarcodeFormat: string; // key in JsBarcode's internal registry (unchanged)
	renderOptions?: () => Record<string, unknown>;
}

export interface BwipDescriptor extends DescriptorBase {
	engine: 'bwipjs';
	bcid: 'qrcode' | 'datamatrix' | 'pdf417' | 'azteccode';
	modulePx: { x: number; y: number }; // px per module at scale 1 (from the BWIPP source)
	denseAbove: number; // module columns above which facts.dense is true
}

export type FormatDescriptor = JsBarcodeDescriptor | BwipDescriptor;

export const DEFAULT_FORMAT: FormatId = 'upc';

export const FORMATS: readonly FormatDescriptor[] = [
	{
		engine: 'jsbarcode',
		id: 'code128',
		jsbarcodeFormat: 'CODE128',
		label: 'CODE128 (auto)',
		group: 'CODE128',
		numeric: false
	},
	{
		engine: 'jsbarcode',
		id: 'code128a',
		jsbarcodeFormat: 'CODE128A',
		label: 'CODE128 A (force mode)',
		group: 'CODE128',
		numeric: false
	},
	{
		engine: 'jsbarcode',
		id: 'code128b',
		jsbarcodeFormat: 'CODE128B',
		label: 'CODE128 B (force mode)',
		group: 'CODE128',
		numeric: false
	},
	{
		engine: 'jsbarcode',
		id: 'code128c',
		jsbarcodeFormat: 'CODE128C',
		label: 'CODE128 C (force mode)',
		group: 'CODE128',
		numeric: false
	},
	{
		engine: 'jsbarcode',
		id: 'ean13',
		jsbarcodeFormat: 'EAN13',
		label: 'EAN-13',
		group: 'EAN / UPC',
		numeric: true
	},
	{
		engine: 'jsbarcode',
		id: 'ean8',
		jsbarcodeFormat: 'EAN8',
		label: 'EAN-8',
		group: 'EAN / UPC',
		numeric: true
	},
	{
		engine: 'jsbarcode',
		id: 'ean5',
		jsbarcodeFormat: 'EAN5',
		label: 'EAN-5 (add-on)',
		group: 'EAN / UPC',
		numeric: true
	},
	{
		engine: 'jsbarcode',
		id: 'ean2',
		jsbarcodeFormat: 'EAN2',
		label: 'EAN-2 (add-on)',
		group: 'EAN / UPC',
		numeric: true
	},
	{
		engine: 'jsbarcode',
		id: 'upc',
		jsbarcodeFormat: 'UPC',
		label: 'UPC-A',
		group: 'EAN / UPC',
		numeric: true
	},
	{
		engine: 'jsbarcode',
		id: 'upce',
		jsbarcodeFormat: 'UPCE',
		label: 'UPC-E',
		group: 'EAN / UPC',
		numeric: true
	},
	{
		engine: 'jsbarcode',
		id: 'code39',
		jsbarcodeFormat: 'CODE39',
		label: 'CODE39',
		group: 'CODE39',
		numeric: false
	},
	{
		engine: 'jsbarcode',
		id: 'itf',
		jsbarcodeFormat: 'ITF',
		label: 'ITF',
		group: 'ITF',
		numeric: true
	},
	{
		engine: 'jsbarcode',
		id: 'itf14',
		jsbarcodeFormat: 'ITF14',
		label: 'ITF-14',
		group: 'ITF',
		numeric: true
	},
	{
		engine: 'jsbarcode',
		id: 'msi',
		jsbarcodeFormat: 'MSI',
		label: 'MSI',
		group: 'MSI',
		numeric: true
	},
	{
		engine: 'jsbarcode',
		id: 'msi10',
		jsbarcodeFormat: 'MSI10',
		label: 'MSI10',
		group: 'MSI',
		numeric: true
	},
	{
		engine: 'jsbarcode',
		id: 'msi11',
		jsbarcodeFormat: 'MSI11',
		label: 'MSI11',
		group: 'MSI',
		numeric: true
	},
	{
		engine: 'jsbarcode',
		id: 'msi1010',
		jsbarcodeFormat: 'MSI1010',
		label: 'MSI1010',
		group: 'MSI',
		numeric: true
	},
	{
		engine: 'jsbarcode',
		id: 'msi1110',
		jsbarcodeFormat: 'MSI1110',
		label: 'MSI1110',
		group: 'MSI',
		numeric: true
	},
	{
		engine: 'jsbarcode',
		id: 'pharmacode',
		jsbarcodeFormat: 'pharmacode',
		label: 'Pharmacode',
		group: 'Other',
		numeric: true
	},
	{
		engine: 'jsbarcode',
		id: 'codabar',
		jsbarcodeFormat: 'codabar',
		label: 'Codabar',
		group: 'Other',
		numeric: false
	},
	{
		engine: 'jsbarcode',
		id: 'code93',
		jsbarcodeFormat: 'CODE93',
		label: 'CODE93',
		group: 'Other',
		numeric: false
	},
	{
		id: 'qr',
		engine: 'bwipjs',
		bcid: 'qrcode',
		label: 'QR Code',
		group: '2D',
		numeric: false,
		modulePx: { x: 2, y: 2 },
		denseAbove: 100,
		ecc: {
			choices: [
				{ value: 'L', label: 'level L', note: '~7% recovery' },
				{ value: 'M', label: 'level M', note: '~15% recovery, default' },
				{ value: 'Q', label: 'level Q', note: '~25% recovery' },
				{ value: 'H', label: 'level H', note: '~30% recovery' }
			],
			defaultValue: 'M'
		}
	},
	{
		id: 'datamatrix',
		engine: 'bwipjs',
		bcid: 'datamatrix',
		label: 'Data Matrix',
		group: '2D',
		numeric: false,
		modulePx: { x: 2, y: 2 },
		denseAbove: 100
	},
	{
		id: 'pdf417',
		engine: 'bwipjs',
		bcid: 'pdf417',
		label: 'PDF417',
		group: '2D',
		numeric: false,
		modulePx: { x: 1, y: 3 },
		denseAbove: 300,
		ecc: {
			choices: [
				{ value: 'auto', label: 'automatic level', note: 'recommended, default' },
				{ value: '0', label: 'level 0', note: 'detection only' },
				...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ value: String(n), label: `level ${n}` }))
			],
			defaultValue: 'auto'
		}
	},
	{
		id: 'aztec',
		engine: 'bwipjs',
		bcid: 'azteccode',
		label: 'Aztec',
		group: '2D',
		numeric: false,
		modulePx: { x: 2, y: 2 },
		denseAbove: 100,
		ecc: {
			choices: [
				{ value: '10', label: '≥10% error correction' },
				{ value: '23', label: '≥23% error correction', note: 'default' },
				{ value: '36', label: '≥36% error correction' },
				{ value: '50', label: '≥50% error correction' }
			],
			defaultValue: '23'
		}
	}
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

// `undefined` (an entry's unset `options.ecc`) yields false / undefined.
export function isEccChoice(d: FormatDescriptor, value: string | undefined): boolean {
	return eccChoice(d, value) !== undefined;
}

export function eccChoice(d: FormatDescriptor, value: string | undefined): EccChoice | undefined {
	return d.ecc?.choices.find((c) => c.value === value);
}
