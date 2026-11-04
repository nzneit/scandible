import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { PNG } from 'pngjs';

export interface Box {
	width: number;
	height: number;
	display: string;
}
/** What the injected script reports once `.barcode-item svg` exists: the first item and its svg. */
export interface Ready {
	item: Box;
	svg: Box;
}
/** An RGBA image, 4 bytes per pixel; pngjs's PNG fits it. */
export interface Bitmap {
	width: number;
	height: number;
	data: Uint8Array;
}

const BASE = '/scandible';

/** The file a request path maps to, as GitHub Pages serves the site; null outside /scandible. */
export function resolveRoute(pathname: string): string | null {
	if (pathname === BASE || pathname === `${BASE}/` || pathname === `${BASE}/index.html`) {
		return 'index.html';
	}
	if (pathname === `${BASE}/play`) return 'play.html';
	if (!pathname.startsWith(`${BASE}/`)) return null;
	const rest = pathname.slice(BASE.length + 1);
	return rest.split('/').some((segment) => segment === '' || segment === '..') ? null : rest;
}

/** The share of pixels whose red, green or blue is below 255; alpha is ignored. */
export function nonWhiteShare(image: Bitmap): number {
	const { width, height, data } = image;
	const pixels = width * height;
	if (pixels === 0) return 0;
	let nonWhite = 0;
	for (let i = 0; i < pixels * 4; i += 4) {
		if (data[i] < 255 || data[i + 1] < 255 || data[i + 2] < 255) nonWhite++;
	}
	return nonWhite / pixels;
}

/** The number of pixels whose RGBA differs; -1 when the sizes differ. */
export function diffPixels(a: Bitmap, b: Bitmap): number {
	if (a.width !== b.width || a.height !== b.height) return -1;
	let differ = 0;
	for (let i = 0; i < a.width * a.height * 4; i += 4) {
		if (
			a.data[i] !== b.data[i] ||
			a.data[i + 1] !== b.data[i + 1] ||
			a.data[i + 2] !== b.data[i + 2] ||
			a.data[i + 3] !== b.data[i + 3]
		) {
			differ++;
		}
	}
	return differ;
}

/** Same display for item and svg, and widths and heights within `tolerance` px. */
export function sameGeometry(a: Ready, b: Ready, tolerance: number): boolean {
	const close = (x: number, y: number) => Math.abs(x - y) <= tolerance;
	const sameBox = (x: Box, y: Box) =>
		x.display === y.display && close(x.width, y.width) && close(x.height, y.height);
	return sameBox(a.item, b.item) && sameBox(a.svg, b.svg);
}

const READY_PATH = '/__stage-ready';
const MIN_NON_WHITE = 0.005;
const TOLERANCE = 0.01;
const SHOT_TIMEOUT_MS = 60_000;
const READY_TIMEOUT_MS = 20_000;
/** How long a beacon sent just before Firefox exits may take to reach the server. */
const BEACON_GRACE_MS = 2_000;
const KILL_GRACE_MS = 5_000;

interface Deck {
	name: string;
	codes: string;
	fmt: string;
}
const DECKS: Deck[] = [
	{ name: 'upc', codes: '036000291452', fmt: 'upc' },
	{ name: 'qr', codes: 'https://example.com/scandible', fmt: 'qr' },
	{ name: 'pdf417', codes: 'SCANDIBLE STAGE CHECK 0123456789', fmt: 'pdf417' }
];
const STEP_SIZES: [number, number][] = [
	[1280, 900],
	[390, 844]
];
const SCROLL_DECKS = ['upc', 'pdf417'];
const SCROLL_SIZE: [number, number] = [1280, 900];

/** Hides the overlay and readout, so only the stage is compared, and reports the first item. */
const INJECTED = `<style>.overlay, .readout { visibility: hidden !important }</style>
<script>
	(() => {
		let sent = false;
		const box = (el) => {
			const rect = el.getBoundingClientRect();
			return { width: rect.width, height: rect.height, display: getComputedStyle(el).display };
		};
		const check = () => {
			const item = document.querySelector('.barcode-item');
			const svg = item && item.querySelector('svg');
			if (sent || !svg) return;
			sent = true;
			observer.disconnect();
			navigator.sendBeacon('${READY_PATH}', JSON.stringify({ item: box(item), svg: box(svg) }));
		};
		const observer = new MutationObserver(check);
		observer.observe(document.documentElement, { childList: true, subtree: true });
		document.addEventListener('DOMContentLoaded', check);
	})();
</script>
`;

const CONTENT_TYPES: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.txt': 'text/plain; charset=utf-8'
};

/** A static server for one build, with the latest `Ready` and the failed requests of a run. */
interface StageServer {
	port: number;
	ready: Ready | null;
	failures: string[];
}

/** A headless Firefox this script started, leading its own process group. */
interface Firefox {
	pid: number | undefined;
	profile: string;
	exited: boolean;
	error: string | null;
}

type Outcome<T> = { ok: true; value: T } | { ok: false; reason: string };
type Verdict = 'PASS' | 'MISMATCH' | 'UNVERIFIED';
interface Comparison {
	verdict: Verdict;
	label: string;
	detail?: string;
}

/** What a run has made so far, so that cleanup undoes exactly that. */
const made: {
	tmp: string | null;
	worktree: string | null;
	servers: Server[];
	firefoxes: Set<Firefox>;
} = { tmp: null, worktree: null, servers: [], firefoxes: new Set() };

let cleaning: Promise<void> | null = null;

const repo = new URL('..', import.meta.url).pathname;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** True once `condition` holds, polled every 50 ms; false when `ms` pass first. */
async function waitFor(condition: () => boolean, ms: number): Promise<boolean> {
	const deadline = Date.now() + ms;
	while (!condition()) {
		if (Date.now() >= deadline) return false;
		await sleep(50);
	}
	return true;
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Runs one build step; a non-zero status throws `<step> failed`. */
function runStep(step: string, command: string, args: string[], cwd: string): void {
	const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
	if (result.status !== 0) throw new Error(`${step} failed`);
}

function isBox(value: unknown): value is Box {
	if (typeof value !== 'object' || value === null) return false;
	const { width, height, display } = value as Record<string, unknown>;
	return Number.isFinite(width) && Number.isFinite(height) && typeof display === 'string';
}

function parseReady(text: string): Ready | null {
	try {
		const value = JSON.parse(text) as Record<string, unknown> | null;
		if (value && isBox(value.item) && isBox(value.svg)) return { item: value.item, svg: value.svg };
	} catch {
		// not JSON: no Ready
	}
	return null;
}

function isFile(path: string): boolean {
	try {
		return statSync(path).isFile();
	} catch {
		return false;
	}
}

async function startServer(dist: string): Promise<StageServer> {
	const stage: StageServer = { port: 0, ready: null, failures: [] };
	const fail = (pathname: string, status: number, res: ServerResponse) => {
		if (pathname.startsWith(BASE)) stage.failures.push(`${status} ${pathname}`);
		res.writeHead(status).end();
	};
	const handle = (req: IncomingMessage, res: ServerResponse) => {
		const { pathname } = new URL(req.url ?? '/', 'http://127.0.0.1');
		if (req.method === 'POST' && pathname === READY_PATH) {
			const chunks: Buffer[] = [];
			req.on('data', (chunk: Buffer) => chunks.push(chunk));
			req.on('error', () => res.destroy());
			req.on('end', () => {
				stage.ready = parseReady(Buffer.concat(chunks).toString('utf8')) ?? stage.ready;
				res.writeHead(204).end();
			});
			return;
		}
		const file = resolveRoute(pathname);
		if (file === null || !isFile(join(dist, file))) return fail(pathname, 404, res);
		try {
			let body = readFileSync(join(dist, file));
			if (file === 'play.html') {
				body = Buffer.from(body.toString('utf8').replace('</head>', () => `${INJECTED}</head>`));
			}
			const type = CONTENT_TYPES[extname(file)] ?? 'application/octet-stream';
			res.writeHead(200, { 'content-type': type }).end(body);
		} catch {
			fail(pathname, 500, res);
		}
	};
	const server = createServer(handle);
	made.servers.push(server);
	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	stage.port = (server.address() as AddressInfo).port;
	return stage;
}

function startFirefox(args: string[]): Firefox {
	if (cleaning !== null) throw new Error('cleanup has begun');
	const profile = mkdtempSync(join(made.tmp ?? tmpdir(), 'profile-'));
	const child = spawn('firefox', ['--headless', '--no-remote', '--profile', profile, ...args], {
		detached: true,
		stdio: 'ignore'
	});
	const firefox: Firefox = { pid: child.pid, profile, exited: false, error: null };
	made.firefoxes.add(firefox);
	child.on('error', () => {
		firefox.error = 'cannot start firefox';
		firefox.exited = true;
	});
	child.on('exit', () => {
		firefox.exited = true;
	});
	return firefox;
}

/** Whether any process of the group led by `pid` is still running. */
function groupAlive(pid: number): boolean {
	try {
		process.kill(-pid, 0);
		return true;
	} catch (error) {
		return (error as NodeJS.ErrnoException).code !== 'ESRCH';
	}
}

function signalGroup(pid: number, signal: NodeJS.Signals): void {
	try {
		process.kill(-pid, signal);
	} catch {
		// the group has already gone
	}
}

/** SIGTERM to Firefox's process group, SIGKILL after 5 s; then its profile is deleted. */
async function stopFirefox(firefox: Firefox): Promise<void> {
	const { pid } = firefox;
	if (pid !== undefined && groupAlive(pid)) {
		signalGroup(pid, 'SIGTERM');
		if (!(await waitFor(() => !groupAlive(pid), KILL_GRACE_MS))) {
			signalGroup(pid, 'SIGKILL');
			if (!(await waitFor(() => !groupAlive(pid), KILL_GRACE_MS))) {
				throw new Error(`firefox process group ${pid} survived SIGKILL`);
			}
		}
	}
	rmSync(firefox.profile, { recursive: true, force: true });
	made.firefoxes.delete(firefox);
}

function deckUrl(stage: StageServer, deck: Deck, step: boolean): string {
	const params = new URLSearchParams({
		codes: deck.codes,
		fmt: deck.fmt,
		mode: 'step',
		rot: '1',
		rotmax: '20',
		seed: '7'
	});
	if (!step) params.delete('mode');
	return `http://127.0.0.1:${stage.port}${BASE}/play#${params}`;
}

function startRun(stage: StageServer): void {
	stage.ready = null;
	stage.failures = [];
}

/** A Step-mode screenshot of one deck at one size, verified as the spec asks. */
async function shoot(
	stage: StageServer,
	file: string,
	deck: Deck,
	size: [number, number]
): Promise<Outcome<Bitmap>> {
	startRun(stage);
	const firefox = startFirefox([
		`--window-size=${size[0]},${size[1]}`,
		'--screenshot',
		file,
		deckUrl(stage, deck, true)
	]);
	const finished = await waitFor(() => firefox.exited, SHOT_TIMEOUT_MS);
	if (finished && !firefox.error) await waitFor(() => stage.ready !== null, BEACON_GRACE_MS);
	await stopFirefox(firefox);
	if (firefox.error) return { ok: false, reason: firefox.error };
	if (!finished) {
		return { ok: false, reason: `firefox timed out after ${SHOT_TIMEOUT_MS / 1000} s` };
	}
	if (!stage.ready) return { ok: false, reason: 'no ready message' };
	if (stage.failures.length > 0) {
		return { ok: false, reason: `not served: ${stage.failures.join(', ')}` };
	}
	if (!existsSync(file)) return { ok: false, reason: 'no screenshot' };
	let image: Bitmap;
	try {
		image = PNG.sync.read(readFileSync(file));
	} catch (error) {
		return { ok: false, reason: `unreadable screenshot: ${message(error)}` };
	}
	const share = nonWhiteShare(image);
	if (share < MIN_NON_WHITE) {
		return { ok: false, reason: `only ${(share * 100).toFixed(2)}% of pixels non-white` };
	}
	return { ok: true, value: image };
}

/** A Scroll-mode load of one deck, stopped once its `Ready` arrives. */
async function measure(stage: StageServer, deck: Deck): Promise<Outcome<Ready>> {
	startRun(stage);
	const firefox = startFirefox([
		`--window-size=${SCROLL_SIZE[0]},${SCROLL_SIZE[1]}`,
		deckUrl(stage, deck, false)
	]);
	await waitFor(() => stage.ready !== null || firefox.exited, READY_TIMEOUT_MS);
	await stopFirefox(firefox);
	if (firefox.error) return { ok: false, reason: firefox.error };
	if (!stage.ready) {
		return { ok: false, reason: `no ready message within ${READY_TIMEOUT_MS / 1000} s` };
	}
	if (stage.failures.length > 0) {
		return { ok: false, reason: `not served: ${stage.failures.join(', ')}` };
	}
	return { ok: true, value: stage.ready };
}

function compare<T>(
	label: string,
	ref: Outcome<T>,
	current: Outcome<T>,
	judge: (a: T, b: T) => string | null
): Comparison {
	if (!ref.ok || !current.ok) {
		const reasons = [
			ref.ok ? null : `ref: ${ref.reason}`,
			current.ok ? null : `current: ${current.reason}`
		];
		return { verdict: 'UNVERIFIED', label, detail: reasons.filter(Boolean).join('; ') };
	}
	const mismatch = judge(ref.value, current.value);
	return mismatch === null
		? { verdict: 'PASS', label }
		: { verdict: 'MISMATCH', label, detail: mismatch };
}

function pixelMismatch(a: Bitmap, b: Bitmap): string | null {
	const differ = diffPixels(a, b);
	if (differ === 0) return null;
	return differ === -1
		? `sizes differ: ${a.width}x${a.height} and ${b.width}x${b.height}`
		: `${differ} pixels differ`;
}

function geometryMismatch(a: Ready, b: Ready): string | null {
	return sameGeometry(a, b, TOLERANCE)
		? null
		: `ref ${JSON.stringify(a)}, current ${JSON.stringify(b)}`;
}

function report(comparison: Comparison): Comparison {
	const { verdict, label, detail } = comparison;
	console.log(detail === undefined ? `${verdict} ${label}` : `${verdict} ${label}: ${detail}`);
	return comparison;
}

/** Builds `ref` and the current tree, compares their play stages and returns the exit code. */
async function stageCheck(ref: string): Promise<number> {
	const tmp = mkdtempSync(join(tmpdir(), 'scandible-stage-'));
	made.tmp = tmp;
	const tree = join(tmp, 'ref');
	runStep(`git worktree add ${ref}`, 'git', ['worktree', 'add', '--detach', tree, ref], repo);
	made.worktree = tree;
	runStep(`npm ci in ${ref}`, 'npm', ['ci'], tree);
	runStep(`npm run build in ${ref}`, 'npm', ['run', 'build'], tree);
	runStep('npm run build in the current tree', 'npm', ['run', 'build'], repo);
	cpSync(join(tree, 'dist'), join(tmp, 'ref-dist'), { recursive: true });
	cpSync(join(repo, 'dist'), join(tmp, 'current-dist'), { recursive: true });
	const builds = {
		ref: await startServer(join(tmp, 'ref-dist')),
		current: await startServer(join(tmp, 'current-dist'))
	};

	const results: Comparison[] = [];
	for (const deck of DECKS) {
		for (const size of STEP_SIZES) {
			const shotOf = (build: 'ref' | 'current') =>
				shoot(builds[build], join(tmp, `${build}-${deck.name}-${size[0]}.png`), deck, size);
			const refShot = await shotOf('ref');
			const currentShot = await shotOf('current');
			const label = `step ${deck.name} ${size[0]}x${size[1]}`;
			results.push(report(compare(label, refShot, currentShot, pixelMismatch)));
		}
	}
	for (const deck of DECKS.filter((d) => SCROLL_DECKS.includes(d.name))) {
		const refReady = await measure(builds.ref, deck);
		const currentReady = await measure(builds.current, deck);
		const label = `scroll ${deck.name} ${SCROLL_SIZE[0]}x${SCROLL_SIZE[1]}`;
		results.push(report(compare(label, refReady, currentReady, geometryMismatch)));
	}

	const count = (verdict: Verdict) => results.filter((r) => r.verdict === verdict).length;
	const [pass, mismatch, unverified] = [count('PASS'), count('MISMATCH'), count('UNVERIFIED')];
	console.log(
		`stage-check: ${pass} PASS, ${mismatch} MISMATCH, ${unverified} UNVERIFIED against ${ref}`
	);
	return mismatch > 0 ? 1 : unverified > 0 ? 2 : 0;
}

/** Stops every Firefox still running, closes the servers, removes the worktree and temp files. */
function cleanup(): Promise<void> {
	cleaning ??= (async () => {
		const attempt = async (what: string, undo: () => unknown) => {
			try {
				await undo();
			} catch (error) {
				console.error(`stage-check: cleanup: ${what}: ${message(error)}`);
			}
		};
		for (const firefox of [...made.firefoxes]) {
			await attempt('stop firefox', () => stopFirefox(firefox));
		}
		for (const server of made.servers) {
			await attempt('close server', () => {
				server.closeAllConnections();
				server.close();
			});
		}
		const { worktree, tmp } = made;
		if (worktree !== null) {
			await attempt('remove worktree', () => {
				const result = spawnSync('git', ['worktree', 'remove', '--force', worktree], {
					cwd: repo,
					stdio: 'inherit'
				});
				if (result.status !== 0) throw new Error(`git worktree remove ${worktree} failed`);
			});
		}
		if (tmp !== null) {
			await attempt('remove temp files', () => rmSync(tmp, { recursive: true, force: true }));
		}
	})();
	return cleaning;
}

/** Prints the reason, cleans up and exits 2: whatever went wrong, the stage is unverified. */
function abort(reason: string): void {
	console.error(`stage-check: UNVERIFIED: ${reason}`);
	void cleanup().finally(() => process.exit(2));
}

if (import.meta.main) {
	process.on('SIGINT', () => abort('interrupted by SIGINT'));
	process.on('SIGTERM', () => abort('interrupted by SIGTERM'));
	process.on('uncaughtException', (error) => abort(message(error)));
	process.on('unhandledRejection', (error) => abort(message(error)));
	let code = 2;
	try {
		code = await stageCheck(process.argv[2] ?? 'main');
	} catch (error) {
		console.error(`stage-check: UNVERIFIED: ${message(error)}`);
	} finally {
		await cleanup();
	}
	process.exit(code);
}
