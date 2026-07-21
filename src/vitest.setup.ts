// jsdom returns null from canvas.getContext(); JsBarcode measures text through a 2D
// context and would throw "Cannot set properties of null (setting 'font')". Provide a
// minimal stub. Bar geometry is still meaningless under jsdom (no layout) — visual
// correctness is verified in the browser — but rendering no longer throws, so structural
// tests can run.
const stub = {
	font: '',
	fillStyle: '',
	textAlign: '',
	textBaseline: '',
	fillRect: () => {},
	fillText: () => {},
	measureText: () => ({ width: 0 }),
	beginPath: () => {},
	moveTo: () => {},
	lineTo: () => {},
	stroke: () => {},
	fill: () => {},
	save: () => {},
	restore: () => {},
	translate: () => {},
	scale: () => {}
};
// @ts-expect-error – deliberately overriding for the test environment
HTMLCanvasElement.prototype.getContext = () => stub;
