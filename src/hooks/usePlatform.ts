// Detecção síncrona da plataforma — o userAgent do WebView reflecte o SO host de forma fiável.
// Tauri/WebKit no macOS inclui "Mac"; Tauri/WebView2 no Windows inclui "Windows";
// Tauri/WebKitGTK no Linux inclui "Linux".
type Platform = 'macos' | 'windows' | 'linux';

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (ua.includes('Mac')) return 'macos';
  if (ua.includes('Linux')) return 'linux';
  return 'windows';
}

const PLATFORM: Platform = detectPlatform();

// Aplica atributo ao <html> uma única vez para CSS adaptativo por plataforma
document.documentElement.setAttribute('data-platform', PLATFORM);

const MOD_SYMBOL = PLATFORM === 'macos' ? '⌘' : 'Ctrl';
const MOD_KEY = PLATFORM === 'macos' ? 'Meta' : 'Control';

export function usePlatform() {
  return {
    platform: PLATFORM,
    isMac: PLATFORM === 'macos',
    isWindows: PLATFORM === 'windows',
    isLinux: PLATFORM === 'linux',
    modSymbol: MOD_SYMBOL,
    modKey: MOD_KEY,
    shortcut: (key: string) => `${MOD_SYMBOL}+${key}`,
  };
}
