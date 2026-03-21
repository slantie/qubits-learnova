'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { cn } from '@/lib/utils';
import { Play } from 'lucide-react';

interface QualityLevel {
    index: number;
    height: number;
    bitrate: number;
}

interface VideoPlayerProps {
    src: string;
    poster?: string;
    title?: string;
    className?: string;
}

export function VideoPlayer({ src, poster, title, className }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Show thumbnail until user presses play
    const [started, setStarted] = useState(false);
    const [levels, setLevels] = useState<QualityLevel[]>([]);
    const [currentLevel, setCurrentLevel] = useState<number>(-1);
    const [activeHeight, setActiveHeight] = useState<number | null>(null);
    const [qualityOpen, setQualityOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const initHls = useCallback(() => {
        const video = videoRef.current;
        if (!video || !src) return;

        setLevels([]);
        setCurrentLevel(-1);
        setActiveHeight(null);
        setError(null);

        if (Hls.isSupported()) {
            const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
            hls.loadSource(src);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
                const ql: QualityLevel[] = data.levels
                    .map((l, i) => ({ index: i, height: l.height, bitrate: l.bitrate }))
                    .sort((a, b) => b.height - a.height);
                setLevels(ql);
                video.play().catch(() => {});
            });

            hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
                const l = hls.levels[data.level];
                if (l) setActiveHeight(l.height);
            });

            hls.on(Hls.Events.ERROR, (_e, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR: hls.startLoad(); break;
                        case Hls.ErrorTypes.MEDIA_ERROR: hls.recoverMediaError(); break;
                        default:
                            setError('Playback error. Please try again.');
                            hls.destroy();
                    }
                }
            });

            hlsRef.current = hls;
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
            video.play().catch(() => {});
        } else {
            setError('Your browser does not support HLS video playback.');
        }
    }, [src]);

    // Clean up HLS when src changes or component unmounts
    useEffect(() => {
        return () => {
            hlsRef.current?.destroy();
            hlsRef.current = null;
        };
    }, [src]);

    const handlePlay = () => {
        setStarted(true);
        // Give React one tick to render the video element before init
        requestAnimationFrame(() => initHls());
    };

    const onQualityChange = useCallback((index: number) => {
        const hls = hlsRef.current;
        if (!hls) return;
        hls.currentLevel = index;
        setCurrentLevel(index);
        setQualityOpen(false);
    }, []);

    // Close quality panel when clicking outside
    useEffect(() => {
        if (!qualityOpen) return;
        const close = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setQualityOpen(false);
            }
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [qualityOpen]);

    if (error) {
        return (
            <div className={cn('flex flex-col items-center justify-center gap-2 rounded-xl bg-black aspect-video text-sm text-gray-400', className)}>
                <span>{error}</span>
                <button
                    onClick={() => { setError(null); setStarted(false); }}
                    className="text-xs text-blue-400 hover:underline"
                >
                    Try again
                </button>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={cn('relative bg-black rounded-xl overflow-hidden select-none', className)}
        >
            {/* ── Thumbnail preview overlay ─────────────────────────────────── */}
            {!started && (
                <div
                    className="absolute inset-0 z-10 cursor-pointer group"
                    onClick={handlePlay}
                >
                    {/* Poster image */}
                    {poster ? (
                        <img
                            src={poster}
                            alt={title ?? 'Video thumbnail'}
                            className="w-full h-full object-cover"
                            draggable={false}
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800" />
                    )}

                    {/* Dark vignette */}
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />

                    {/* Title */}
                    {title && (
                        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 bg-gradient-to-t from-black/80 to-transparent pt-10">
                            <p className="text-white font-semibold text-base leading-snug line-clamp-2 drop-shadow">
                                {title}
                            </p>
                        </div>
                    )}

                    {/* Play button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="size-16 rounded-full bg-white/90 group-hover:bg-white group-hover:scale-110 transition-all duration-150 flex items-center justify-center shadow-xl">
                            <Play className="size-7 text-black fill-black ml-1" />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Video element (always in DOM so it's ready when started) ──── */}
            <video
                ref={videoRef}
                poster={poster}
                controls
                playsInline
                className={cn('w-full block aspect-video', !started && 'invisible')}
            />

            {/* ── Quality selector ─────────────────────────────────────────── */}
            {started && levels.length > 1 && (
                <div className="absolute top-2 right-2 z-20">
                    <button
                        onClick={() => setQualityOpen(o => !o)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-sm text-white text-xs font-medium hover:bg-black/90 transition-colors"
                    >
                        <svg className="size-3 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M4 6h16M4 10h16M4 14h10M4 18h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        {currentLevel === -1
                            ? `Auto${activeHeight ? ` · ${activeHeight}p` : ''}`
                            : `${levels.find(l => l.index === currentLevel)?.height ?? ''}p`}
                        <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 9l6 6 6-6" />
                        </svg>
                    </button>

                    {qualityOpen && (
                        <div className="absolute right-0 top-full mt-1 bg-black/95 backdrop-blur-sm rounded-xl border border-white/10 p-1.5 min-w-32 z-30 flex flex-col gap-0.5 shadow-2xl">
                            <p className="px-2.5 pt-1 pb-0.5 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Quality</p>

                            <button
                                onClick={() => onQualityChange(-1)}
                                className={cn(
                                    'flex items-center justify-between gap-4 px-2.5 py-1.5 rounded-lg text-xs transition-colors',
                                    currentLevel === -1
                                        ? 'bg-blue-600/25 text-blue-400 font-semibold'
                                        : 'text-gray-300 hover:bg-white/8',
                                )}
                            >
                                <span>Auto</span>
                                {currentLevel === -1 && activeHeight && (
                                    <span className="text-[10px] text-gray-500">{activeHeight}p</span>
                                )}
                            </button>

                            {levels.map(level => {
                                const selected = currentLevel === level.index;
                                return (
                                    <button
                                        key={level.index}
                                        onClick={() => onQualityChange(level.index)}
                                        className={cn(
                                            'flex items-center justify-between gap-4 px-2.5 py-1.5 rounded-lg text-xs transition-colors',
                                            selected
                                                ? 'bg-blue-600/25 text-blue-400 font-semibold'
                                                : 'text-gray-300 hover:bg-white/8',
                                        )}
                                    >
                                        <span className="flex items-center gap-1.5">
                                            {level.height}p
                                            {selected && <span className="size-1.5 rounded-full bg-green-400 inline-block" />}
                                        </span>
                                        <span className="text-[10px] text-gray-600">
                                            {(level.bitrate / 1_000_000).toFixed(1)} Mbps
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Active quality badge (bottom-left, non-interactive) */}
            {started && activeHeight && !qualityOpen && (
                <div className="absolute bottom-14 left-2 pointer-events-none bg-black/60 text-gray-400 text-[10px] px-1.5 py-0.5 rounded-md">
                    {activeHeight}p{currentLevel === -1 ? ' (auto)' : ''}
                </div>
            )}
        </div>
    );
}
