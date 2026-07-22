declare module 'jsbarcode' {
	const JsBarcode: (element: unknown, data: string, options?: Record<string, unknown>) => void;
	export default JsBarcode;
}

declare module 'jsbarcode/bin/barcodes' {
	/** Internal encoder-class surface checkCode relies on. Constructors may normalize
	 *  the input into `data` (check digits, checksums, uppercasing, codabar guards). */
	interface JsBarcodeEncoder {
		data: string;
		valid(): boolean;
	}
	const barcodes: Record<
		string,
		new (data: string, options: Record<string, unknown>) => JsBarcodeEncoder
	>;
	export default barcodes;
}
