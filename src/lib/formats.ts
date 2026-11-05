/** Format registry: 36 formats. The 21 linear formats JsBarcode documents (`engine: 'jsbarcode'`),
 *  four 2D symbologies and eleven GS1 carriers rendered by bwip-js (`engine: 'bwipjs'`).
 *  Descriptors stay data-only; behaviour lives in `src/lib/engines/`. CODE39 must never
 *  define `normalize` — the encoder's own uppercasing is what the UI's
 *  `raw ✓ valid → encoded` row exists to surface; the GS1 descriptors are the only ones that do,
 *  to strip whitespace. */

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
	| 'aztec'
	| 'gs1128'
	| 'databaromni'
	| 'databartruncated'
	| 'databarstacked'
	| 'databarstackedomni'
	| 'databarlimited'
	| 'databarexpanded'
	| 'databarexpandedstacked'
	| 'gs1datamatrix'
	| 'gs1qr'
	| 'gs1dotcode';

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

export interface Gs1Carrier {
	aim: string; // the AIM symbology identifier the scanner prefixes: ']C1', ']e0', ']d2', ']Q3', ']J1'
	gtinCheck?: 'own' | 'implied';
	// 'own': the five GTIN-only DataBar members check the GTIN themselves (lax cannot override) and
	//        accept 13 digits, encoding the check digit. 'implied': Expanded and Expanded Stacked
	//        recompute the check digit of a leading 14-digit (01). See _Scan data_.
}

export type BwipEncoderId =
	| 'qrcode'
	| 'datamatrix'
	| 'pdf417'
	| 'azteccode'
	| 'gs1_128'
	| 'databaromni'
	| 'databartruncated'
	| 'databarstacked'
	| 'databarstackedomni'
	| 'databarlimited'
	| 'databarexpanded'
	| 'databarexpandedstacked'
	| 'gs1datamatrix'
	| 'gs1qrcode'
	| 'gs1dotcode';

export interface BwipDescriptor extends DescriptorBase {
	engine: 'bwipjs';
	bcid: BwipEncoderId; // the named encoder in bwip-js/browser; the engine's ENCODERS map is keyed by it
	shape: 'linear' | '2d'; // '2d' takes the matrix render path and CSS; 'linear' the 3 px/module path
	gs1?: Gs1Carrier; // present on GS1 carriers only
	quietZone: number; // modules of padding on every side
	modulePx: { x: number; y: number }; // px per module at scale 1 (measurements §1)
	moduleOffsetPx?: { x: number; y: number }; // px to subtract before dividing; DotCode draws 2n + 1
	denseAbove: number; // module columns above which facts.dense is true
	heightMm?: number; // bwip-js `height`; GS1-128 only. Never set for DataBar (measurements §1)
	maxChars?: number; // soft ceiling on data characters (GS excluded); GS1-128: 48
}

export type FormatDescriptor = JsBarcodeDescriptor | BwipDescriptor;

export const DEFAULT_FORMAT: FormatId = 'upc';

const QR_ECC: EccOption = {
	choices: [
		{ value: 'L', label: 'level L', note: '~7% recovery' },
		{ value: 'M', label: 'level M', note: '~15% recovery, default' },
		{ value: 'Q', label: 'level Q', note: '~25% recovery' },
		{ value: 'H', label: 'level H', note: '~30% recovery' }
	],
	defaultValue: 'M'
};

const stripWhitespace = (token: string) => token.replace(/\s+/g, '');

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
		shape: '2d',
		quietZone: 4,
		label: 'QR Code',
		group: '2D',
		numeric: false,
		modulePx: { x: 2, y: 2 },
		denseAbove: 100,
		ecc: QR_ECC
	},
	{
		id: 'datamatrix',
		engine: 'bwipjs',
		bcid: 'datamatrix',
		shape: '2d',
		quietZone: 4,
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
		shape: '2d',
		quietZone: 8,
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
		shape: '2d',
		quietZone: 4,
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
	},
	{
		id: 'gs1128',
		engine: 'bwipjs',
		bcid: 'gs1_128',
		label: 'GS1-128',
		group: 'GS1',
		numeric: false,
		normalize: stripWhitespace,
		shape: 'linear',
		gs1: { aim: ']C1' },
		modulePx: { x: 1, y: 1 },
		quietZone: 10,
		denseAbove: 300,
		heightMm: 18.3,
		maxChars: 48
	},
	{
		id: 'databaromni',
		engine: 'bwipjs',
		bcid: 'databaromni',
		label: 'GS1 DataBar Omnidirectional',
		group: 'GS1',
		numeric: false,
		normalize: stripWhitespace,
		shape: 'linear',
		gs1: { aim: ']e0', gtinCheck: 'own' },
		modulePx: { x: 1, y: 1 },
		quietZone: 10,
		denseAbove: 300
	},
	{
		id: 'databartruncated',
		engine: 'bwipjs',
		bcid: 'databartruncated',
		label: 'GS1 DataBar Truncated',
		group: 'GS1',
		numeric: false,
		normalize: stripWhitespace,
		shape: 'linear',
		gs1: { aim: ']e0', gtinCheck: 'own' },
		modulePx: { x: 1, y: 1 },
		quietZone: 10,
		denseAbove: 300
	},
	{
		id: 'databarstacked',
		engine: 'bwipjs',
		bcid: 'databarstacked',
		label: 'GS1 DataBar Stacked',
		group: 'GS1',
		numeric: false,
		normalize: stripWhitespace,
		shape: 'linear',
		gs1: { aim: ']e0', gtinCheck: 'own' },
		modulePx: { x: 1, y: 1 },
		quietZone: 10,
		denseAbove: 300
	},
	{
		id: 'databarstackedomni',
		engine: 'bwipjs',
		bcid: 'databarstackedomni',
		label: 'GS1 DataBar Stacked Omnidirectional',
		group: 'GS1',
		numeric: false,
		normalize: stripWhitespace,
		shape: 'linear',
		gs1: { aim: ']e0', gtinCheck: 'own' },
		modulePx: { x: 1, y: 1 },
		quietZone: 10,
		denseAbove: 300
	},
	{
		id: 'databarlimited',
		engine: 'bwipjs',
		bcid: 'databarlimited',
		label: 'GS1 DataBar Limited',
		group: 'GS1',
		numeric: false,
		normalize: stripWhitespace,
		shape: 'linear',
		gs1: { aim: ']e0', gtinCheck: 'own' },
		modulePx: { x: 1, y: 1 },
		quietZone: 10,
		denseAbove: 300
	},
	{
		id: 'databarexpanded',
		engine: 'bwipjs',
		bcid: 'databarexpanded',
		label: 'GS1 DataBar Expanded',
		group: 'GS1',
		numeric: false,
		normalize: stripWhitespace,
		shape: 'linear',
		gs1: { aim: ']e0', gtinCheck: 'implied' },
		modulePx: { x: 1, y: 1 },
		quietZone: 10,
		denseAbove: 300
	},
	{
		id: 'databarexpandedstacked',
		engine: 'bwipjs',
		bcid: 'databarexpandedstacked',
		label: 'GS1 DataBar Expanded Stacked',
		group: 'GS1',
		numeric: false,
		normalize: stripWhitespace,
		shape: 'linear',
		gs1: { aim: ']e0', gtinCheck: 'implied' },
		modulePx: { x: 1, y: 1 },
		quietZone: 10,
		denseAbove: 300
	},
	{
		id: 'gs1datamatrix',
		engine: 'bwipjs',
		bcid: 'gs1datamatrix',
		label: 'GS1 DataMatrix',
		group: 'GS1',
		numeric: false,
		normalize: stripWhitespace,
		shape: '2d',
		gs1: { aim: ']d2' },
		modulePx: { x: 2, y: 2 },
		quietZone: 4,
		denseAbove: 100
	},
	{
		id: 'gs1qr',
		engine: 'bwipjs',
		bcid: 'gs1qrcode',
		label: 'GS1 QR Code',
		group: 'GS1',
		numeric: false,
		normalize: stripWhitespace,
		shape: '2d',
		gs1: { aim: ']Q3' },
		modulePx: { x: 2, y: 2 },
		quietZone: 4,
		denseAbove: 100,
		ecc: QR_ECC
	},
	{
		id: 'gs1dotcode',
		engine: 'bwipjs',
		bcid: 'gs1dotcode',
		label: 'GS1 DotCode',
		group: 'GS1',
		numeric: false,
		normalize: stripWhitespace,
		shape: '2d',
		gs1: { aim: ']J1' },
		modulePx: { x: 2, y: 2 },
		moduleOffsetPx: { x: 1, y: 1 },
		quietZone: 4,
		denseAbove: 100
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

/** The canonical form of a level for a format, as Settings.ecc and Row.ecc hold it. */
export function canonicalEcc(format: FormatId, ecc: string): string {
	const d = FORMAT_BY_ID.get(format);
	if (!d?.ecc || !isEccChoice(d, ecc) || ecc === d.ecc.defaultValue) return '';
	return ecc;
}

/** Narrowing guard used by the engine, the page, the editor and canonicalLax. */
export function isGs1(d: FormatDescriptor | undefined): d is BwipDescriptor & { gs1: Gs1Carrier } {
	return d?.engine === 'bwipjs' && d.gs1 !== undefined;
}

/** A lax flag is meaningful only on a GS1 format. */
export function canonicalLax(format: FormatId, lax: boolean): boolean {
	return lax && isGs1(FORMAT_BY_ID.get(format));
}
