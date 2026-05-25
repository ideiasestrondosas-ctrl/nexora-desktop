import React, { useRef, useState, useEffect, useCallback } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Play, Pause } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface VisualComparatorPlayerProps {
  originalPath: string;
  processedPath: string;
}

export function VisualComparatorPlayer({
  originalPath,
  processedPath,
}: VisualComparatorPlayerProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLVideoElement>(null);
  const rightRef = useRef<HTMLVideoElement>(null);
  const [splitPct, setSplitPct] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const isDragging = useRef(false);

  const leftSrc = convertFileSrc(originalPath);
  const rightSrc = convertFileSrc(processedPath);

  useEffect(() => {
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;

    const onTimeUpdate = () => {
      setCurrentTime(left.currentTime);
      if (Math.abs(right.currentTime - left.currentTime) > 0.1) {
        right.currentTime = left.currentTime;
      }
    };

    const onLoadedMetadata = () => setDuration(left.duration);

    left.addEventListener('timeupdate', onTimeUpdate);
    left.addEventListener('loadedmetadata', onLoadedMetadata);
    return () => {
      left.removeEventListener('timeupdate', onTimeUpdate);
      left.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, []);

  const togglePlay = useCallback(async () => {
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;

    if (left.paused) {
      await Promise.all([left.play(), right.play()]);
      setIsPlaying(true);
    } else {
      left.pause();
      right.pause();
      setIsPlaying(false);
    }
  }, []);

  const onScrubChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (leftRef.current) leftRef.current.currentTime = time;
    if (rightRef.current) rightRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setSplitPct(pct);
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={containerRef}
        className="relative w-full aspect-video bg-black rounded-xl overflow-hidden select-none cursor-col-resize"
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <video
          ref={leftRef}
          src={leftSrc}
          className="absolute inset-0 w-full h-full object-contain"
          preload="metadata"
          style={{ zIndex: 1 }}
        />

        <video
          ref={rightRef}
          src={rightSrc}
          className="absolute inset-0 w-full h-full object-contain"
          preload="metadata"
          muted
          style={{
            zIndex: 2,
            clipPath: `inset(0 0 0 ${splitPct}%)`,
          }}
        />

        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-[0_0_8px_rgba(0,0,0,0.6)]"
          style={{ left: `${splitPct}%`, zIndex: 3 }}
        />

        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white/90 shadow-lg flex items-center justify-center cursor-col-resize hover:scale-110 transition-transform"
          style={{ left: `${splitPct}%`, zIndex: 4 }}
          onMouseDown={onDividerMouseDown}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M5 2L2 7L5 12M9 2L12 7L9 12"
              stroke="#333"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <span
          className="absolute bottom-2 left-2 text-xs font-bold text-white/80 bg-black/40 px-1.5 py-0.5 rounded"
          style={{ zIndex: 5 }}
        >
          {t('comparator.original')}
        </span>
        <span
          className="absolute bottom-2 right-2 text-xs font-bold text-white/80 bg-black/40 px-1.5 py-0.5 rounded"
          style={{ zIndex: 5 }}
        >
          {t('comparator.processed')}
        </span>

        <span
          className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] text-white/60 bg-black/30 px-2 py-0.5 rounded-full pointer-events-none"
          style={{ zIndex: 5 }}
        >
          {t('comparator.dragHint')}
        </span>
      </div>

      <div className="flex items-center gap-3 px-1">
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-brand/10 hover:bg-brand/20 text-brand flex items-center justify-center transition-colors flex-shrink-0"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={currentTime}
          onChange={onScrubChange}
          className="flex-1 accent-brand h-1.5 cursor-pointer"
        />

        <span className="text-xs text-text-muted font-mono tabular-nums flex-shrink-0">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
