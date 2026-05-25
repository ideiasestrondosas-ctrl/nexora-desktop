import { useEffect, useState } from 'react';
import { usePlatform } from '@/hooks/usePlatform';

const PLATFORM_ICONS: Record<string, string> = {
  windows: '🪟',
  macos: '🍎',
  linux: '🐧',
};

const NATIVE_FONTS: Record<string, string> = {
  windows: 'Segoe UI Variable',
  macos: 'SF Pro Text',
  linux: 'Cantarell',
};

export default function PlatformDebugBadge() {
  const { platform, modSymbol } = usePlatform();
  const [fontLoaded, setFontLoaded] = useState<boolean | null>(null);
  const [micaHint, setMicaHint] = useState('—');

  useEffect(() => {
    document.fonts.ready.then(() => {
      const targetFont = NATIVE_FONTS[platform];
      setFontLoaded(targetFont ? document.fonts.check(`12px '${targetFont}'`) : false);
    });

    // Heurística: se a janela tiver background transparente e for Windows, Mica está ativo
    if (platform === 'windows') {
      const bg = getComputedStyle(document.body).backgroundColor;
      setMicaHint(bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent' ? 'active ✓' : 'bg opaque');
    } else if (platform === 'macos') {
      setMicaHint('Vibrancy');
    }
  }, [platform]);

  if (!import.meta.env.DEV) return null;

  const nativeFont = NATIVE_FONTS[platform] ?? 'system-ui';

  return (
    <div className="fixed bottom-24 right-4 z-[9999] pointer-events-none select-none">
      {/* Painel glass para provar o efeito Mica/Vibrancy — background propositadamente transparente */}
      <div
        className="rounded-xl border border-white/10 px-3 py-2.5 space-y-1.5 text-[10px] font-mono"
        style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(24px) saturate(1.8)' }}
      >
        <div className="text-white/40 uppercase tracking-widest text-[8px] font-bold">
          DEV · Platform Info
        </div>

        <div className="flex items-center gap-2 text-white/80">
          <span>{PLATFORM_ICONS[platform] ?? '🖥️'}</span>
          <span className="font-bold">{platform}</span>
          <span className="text-white/30">·</span>
          <span className="text-white/50">{modSymbol}+key</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={
              fontLoaded
                ? 'text-green-400'
                : fontLoaded === false
                  ? 'text-yellow-400'
                  : 'text-white/30'
            }
          >
            {fontLoaded === null ? '⋯' : fontLoaded ? '✓' : '~'}
          </span>
          <span className={fontLoaded ? 'text-white/80' : 'text-white/40'}>
            {fontLoaded ? nativeFont : 'fallback (Inter/system)'}
          </span>
        </div>

        {(platform === 'windows' || platform === 'macos') && (
          <div className="flex items-center gap-1.5">
            <span className={micaHint.includes('✓') ? 'text-green-400' : 'text-yellow-400'}>◈</span>
            <span className="text-white/60">
              {platform === 'windows' ? 'Mica' : 'Vibrancy'}: {micaHint}
            </span>
          </div>
        )}

        <div className="text-white/20 text-[8px] pt-0.5 border-t border-white/5">
          Este painel usa glass — se Mica activo, fundo varia com wallpaper
        </div>
      </div>
    </div>
  );
}
