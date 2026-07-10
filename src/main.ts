import './styles.css';
import { decodeShareUrl } from './shareUrl';
import { parseUpcList } from './upc';
import { mountSetupView } from './setupView';
import { mountPlayView } from './playView';
import { DEFAULT_SETTINGS, type Settings, type UpcEntry } from './types';

export function startApp(root: HTMLElement, search: string): void {
  const decoded = decodeShareUrl(search);
  let entries: UpcEntry[] = parseUpcList(decoded.codes.join('\n'));
  let settings: Settings = { ...DEFAULT_SETTINGS, ...decoded.settings };

  const showSetup = () => {
    mountSetupView(root, { codes: entries.map((e) => e.raw), settings }, (e, s) => {
      entries = e;
      settings = s;
      showPlay();
    });
  };
  const showPlay = () => {
    mountPlayView(root, entries, settings, showSetup);
  };

  showSetup();
}

const appRoot = document.getElementById('app');
if (appRoot) startApp(appRoot, location.search);
