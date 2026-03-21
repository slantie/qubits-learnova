'use client';

import {
    useEffect, useRef, useState, useCallback,
    useImperativeHandle, forwardRef, type MouseEvent as ReactMouseEvent,
} from 'react';
import Hls from 'hls.js';
import { cn } from '@/lib/utils';
import {
    Play, Pause, SpeakerHigh, SpeakerX, ArrowsOut, ArrowsIn,
    GearSix, SkipForward, SkipBack,
} from '@phosphor-icons/react';

interface QualityLevel {
    index: number;
    height: number;
    bitrate: number;
}

export interface VideoTimestamp {
    time: number;
    label: string;
    description?: string;
}

export interface VideoPlayerHandle {
    seekTo: (time: number) => void;
}

interface VideoPlayerProps {
    src: string;
    poster?: string;
    title?: string;
    timestamps?: VideoTimestamp[];
    className?: string;
}

function fmtTime(t: number): string {
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
    function VideoPlayer({ src, poster, title, timestamps, className }, ref) {
        const videoRef = useRef<HTMLVideoElement>(null);
        const hlsRef = useRef<Hls | null>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const progressRef = useRef<HTMLDivElement>(null);
        const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

        const [started, setStarted] = useState(false);
        const [playing, setPlaying] = useState(false);
        const [currentTime, setCurrentTime] = useState(0);
        const [duration, setDuration] = useState(0);
        const [buffered, setBuffered] = useState(0);
        const [volume, setVolume] = useState(1);
        const [muted, setMuted] = useState(false);
        const [isFullscreen, setIsFullscreen] = useState(false);
        const [showControls, setShowControls] = useState(true);
        const [error, setError] = useState<string | null>(null);

        const [hoverTime, setHoverTime] = useState<number | null>(null);
        const [hoverX, setHoverX] = useState(0);

        const [levels, setLevels] = useState<QualityLevel[]>([]);
        const [currentLevel, setCurrentLevel] = useState(-1);
        const [activeHeight, setActiveHeight] = useState<number | null>(null);
        const [settingsOpen, setSettingsOpen] = useState(false);
        const [nativeRatio, setNativeRatio] = useState<string | null>(null);

        const sorted = timestamps?.length
            ? [...timestamps].sort((a, b) => a.time - b.time)
            : null;

        const getChapterAt = (t: number) => {
            if (!sorted) return null;
            let ch = null;
            for (const ts of sorted) {
                if (t >= ts.time) ch = ts;
                else break;
            }
            return ch;
        };

        const activeChapter = getChapterAt(currentTime);
        const hoverChapter = hoverTime !== null ? getChapterAt(hoverTime) : null;

        // ── HLS init ──────────────────────────────────────────────────────────
        const initHls = useCallback(() => {
            const video = videoRef.current;
            if (!video || !src) return;
            setLevels([]); setCurrentLevel(-1); setActiveHeight(null); setError(null);

            if (Hls.isSupported()) {
                const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
                hls.loadSource(src);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
                    setLevels(
                        data.levels
                            .map((l, i) => ({ index: i, height: l.height, bitrate: l.bitrate }))
                            .sort((a, b) => b.height - a.height),
                    );
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
                            default: setError('Playback error.'); hls.destroy();
                        }
                    }
                });
                hlsRef.current = hls;
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = src;
                video.play().catch(() => {});
            } else {
                setError('Your browser does not support HLS playback.');
            }
        }, [src]);

        useEffect(() => () => { hlsRef.current?.destroy(); hlsRef.current = null; }, [src]);

        // ── Video events ──────────────────────────────────────────────────────
        useEffect(() => {
            const v = videoRef.current;
            if (!v) return;
            const onTime = () => setCurrentTime(v.currentTime);
            const onDur = () => setDuration(v.duration || 0);
            const onPlay = () => setPlaying(true);
            const onPause = () => setPlaying(false);
            const onProgress = () => {
                if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
            };
            const onMeta = () => {
                if (v.videoWidth && v.videoHeight) {
                    setNativeRatio(`${v.videoWidth} / ${v.videoHeight}`);
                }
            };
            v.addEventListener('timeupdate', onTime);
            v.addEventListener('durationchange', onDur);
            v.addEventListener('play', onPlay);
            v.addEventListener('pause', onPause);
            v.addEventListener('progress', onProgress);
            v.addEventListener('loadedmetadata', onMeta);
            return () => {
                v.removeEventListener('timeupdate', onTime);
                v.removeEventListener('durationchange', onDur);
                v.removeEventListener('play', onPlay);
                v.removeEventListener('pause', onPause);
                v.removeEventListener('progress', onProgress);
                v.removeEventListener('loadedmetadata', onMeta);
            };
        }, [started]);

        // ── Auto-hide controls ────────────────────────────────────────────────
        const resetHideTimer = useCallback(() => {
            setShowControls(true);
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
            hideTimerRef.current = setTimeout(() => {
                if (videoRef.current && !videoRef.current.paused) setShowControls(false);
            }, 3000);
        }, []);

        useEffect(() => {
            const el = containerRef.current;
            if (!el) return;
            const onMove = () => resetHideTimer();
            const onLeave = () => { if (videoRef.current && !videoRef.current.paused) setShowControls(false); };
            el.addEventListener('mousemove', onMove);
            el.addEventListener('mouseleave', onLeave);
            return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave); };
        }, [resetHideTimer]);

        // ── Fullscreen ────────────────────────────────────────────────────────
        useEffect(() => {
            const onChange = () => setIsFullscreen(!!document.fullscreenElement);
            document.addEventListener('fullscreenchange', onChange);
            return () => document.removeEventListener('fullscreenchange', onChange);
        }, []);

        const toggleFullscreen = () => {
            if (!containerRef.current) return;
            if (document.fullscreenElement) document.exitFullscreen();
            else containerRef.current.requestFullscreen();
        };

        // ── Keyboard shortcuts ────────────────────────────────────────────────
        useEffect(() => {
            if (!started) return;
            const handler = (e: KeyboardEvent) => {
                const v = videoRef.current;
                if (!v) return;
                if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
                switch (e.key) {
                    case ' ':
                    case 'k': e.preventDefault(); v.paused ? v.play() : v.pause(); break;
                    case 'ArrowLeft': e.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 5); break;
                    case 'ArrowRight': e.preventDefault(); v.currentTime = Math.min(v.duration, v.currentTime + 5); break;
                    case 'ArrowUp': e.preventDefault(); v.volume = Math.min(1, v.volume + 0.1); setVolume(v.volume); break;
                    case 'ArrowDown': e.preventDefault(); v.volume = Math.max(0, v.volume - 0.1); setVolume(v.volume); break;
                    case 'f': e.preventDefault(); toggleFullscreen(); break;
                    case 'm': e.preventDefault(); v.muted = !v.muted; setMuted(v.muted); break;
                }
            };
            window.addEventListener('keydown', handler);
            return () => window.removeEventListener('keydown', handler);
        }, [started]);

        // ── Actions ───────────────────────────────────────────────────────────
        const seekTo = useCallback((time: number) => {
            const v = videoRef.current;
            if (v) { v.currentTime = time; if (v.paused) v.play().catch(() => {}); }
            if (!started) {
                setStarted(true);
                requestAnimationFrame(() => {
                    initHls();
                    setTimeout(() => { if (videoRef.current) videoRef.current.currentTime = time; }, 500);
                });
            }
        }, [started, initHls]);

        useImperativeHandle(ref, () => ({ seekTo }), [seekTo]);

        const togglePlay = () => {
            const v = videoRef.current;
            if (!v) return;
            v.paused ? v.play().catch(() => {}) : v.pause();
        };

        const handleStart = () => {
            setStarted(true);
            requestAnimationFrame(() => initHls());
        };

        const onQualityChange = (index: number) => {
            const hls = hlsRef.current;
            if (!hls) return;
            hls.currentLevel = index;
            setCurrentLevel(index);
            setSettingsOpen(false);
        };

        // ── Progress bar helpers ──────────────────────────────────────────────
        const getTimeFromMouse = (e: ReactMouseEvent<HTMLDivElement>) => {
            const rect = progressRef.current?.getBoundingClientRect();
            if (!rect || !duration) return 0;
            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            return pct * duration;
        };

        const handleProgressClick = (e: ReactMouseEvent<HTMLDivElement>) => {
            const time = getTimeFromMouse(e);
            if (videoRef.current) { videoRef.current.currentTime = time; }
        };

        const handleProgressHover = (e: ReactMouseEvent<HTMLDivElement>) => {
            const time = getTimeFromMouse(e);
            setHoverTime(time);
            const rect = progressRef.current?.getBoundingClientRect();
            if (rect) setHoverX(e.clientX - rect.left);
        };

        // ── Chapter segments for the progress bar ─────────────────────────────
        const getChapterSegments = () => {
            if (!sorted || !duration) return null;
            const segments: { start: number; end: number; label: string }[] = [];
            for (let i = 0; i < sorted.length; i++) {
                segments.push({
                    start: sorted[i].time,
                    end: i + 1 < sorted.length ? sorted[i + 1].time : duration,
                    label: sorted[i].label,
                });
            }
            return segments;
        };

        const segments = getChapterSegments();

        // Close settings when clicking outside
        useEffect(() => {
            if (!settingsOpen) return;
            const close = (e: MouseEvent) => {
                if (containerRef.current && !containerRef.current.contains(e.target as Node)) setSettingsOpen(false);
            };
            document.addEventListener('mousedown', close);
            return () => document.removeEventListener('mousedown', close);
        }, [settingsOpen]);

        if (error) {
            return (
                <div className={cn('flex flex-col items-center justify-center gap-2 rounded-xl bg-black aspect-video text-sm text-gray-400', className)}>
                    <span>{error}</span>
                    <button onClick={() => { setError(null); setStarted(false); }} className="text-xs text-blue-400 hover:underline">Try again</button>
                </div>
            );
        }

        const pct = duration ? (currentTime / duration) * 100 : 0;
        const bufPct = duration ? (buffered / duration) * 100 : 0;

        return (
            <div className={cn('relative', className)}>
                <div
                    ref={containerRef}
                    className="relative bg-black rounded-xl overflow-hidden select-none group/player"
                    style={{ aspectRatio: nativeRatio ?? '16 / 9' }}
                    onDoubleClick={toggleFullscreen}
                >
                    {/* ── Poster overlay ──────────────────────────────────────── */}
                    {!started && (
                        <div className="absolute inset-0 z-10 cursor-pointer group" onClick={handleStart}>
                            {poster ? (
                                <img src={poster} alt={title ?? ''} className="w-full h-full object-cover" draggable={false} />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800" />
                            )}
                            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
                            {title && (
                                <div className="absolute bottom-0 left-0 right-0 px-5 pb-14 bg-gradient-to-t from-black/80 to-transparent pt-10">
                                    <p className="text-white font-semibold text-base leading-snug line-clamp-2 drop-shadow">{title}</p>
                                </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="size-16 rounded-full bg-white/90 group-hover:bg-white group-hover:scale-110 transition-all duration-150 flex items-center justify-center shadow-xl">
                                    <Play className="size-7 text-black fill-black ml-1" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Video element ───────────────────────────────────────── */}
                    <video
                        ref={videoRef}
                        poster={poster}
                        playsInline
                        onClick={togglePlay}
                        className={cn('w-full h-full block', !started && 'invisible')}
                    />

                    {/* ── Click-to-play center icon ──────────────────────────── */}
                    {started && !playing && showControls && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                            <div className="size-14 rounded-full bg-black/50 flex items-center justify-center">
                                <Play className="size-7 text-white fill-white ml-0.5" />
                            </div>
                        </div>
                    )}

                    {/* ── Controls overlay ────────────────────────────────────── */}
                    {started && (
                        <div className={cn(
                            'absolute inset-x-0 bottom-0 z-20 transition-opacity duration-300',
                            showControls || !playing ? 'opacity-100' : 'opacity-0 pointer-events-none',
                        )}>
                            {/* Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

                            <div className="relative px-3 pb-2 pt-8 flex flex-col gap-1.5">
                                {/* ── Chapter title ──────────────────────────── */}
                                {activeChapter && (
                                    <div className="px-1 mb-0.5">
                                        <span className="text-[11px] text-white/80 font-medium">{activeChapter.label}</span>
                                    </div>
                                )}

                                {/* ── Progress bar ───────────────────────────── */}
                                <div
                                    ref={progressRef}
                                    className="relative h-[18px] flex items-end cursor-pointer group/progress"
                                    onClick={handleProgressClick}
                                    onMouseMove={handleProgressHover}
                                    onMouseLeave={() => setHoverTime(null)}
                                >
                                    {/* Hover tooltip */}
                                    {hoverTime !== null && (
                                        <div
                                            className="absolute bottom-full mb-2 -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center"
                                            style={{ left: hoverX }}
                                        >
                                            {hoverChapter && (
                                                <span className="text-[10px] text-white bg-black/90 rounded px-1.5 py-0.5 mb-0.5 whitespace-nowrap max-w-[200px] truncate">
                                                    {hoverChapter.label}
                                                </span>
                                            )}
                                            <span className="text-[11px] font-mono text-white bg-black/90 rounded px-1.5 py-0.5 tabular-nums">
                                                {fmtTime(hoverTime)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Track */}
                                    {segments ? (
                                        <div className="absolute bottom-0 left-0 right-0 flex h-[3px] group-hover/progress:h-[5px] transition-all gap-[2px]">
                                            {segments.map((seg, i) => {
                                                const segStart = (seg.start / duration) * 100;
                                                const segWidth = ((seg.end - seg.start) / duration) * 100;
                                                const segProgress = Math.max(0, Math.min(100, ((currentTime - seg.start) / (seg.end - seg.start)) * 100));
                                                const segBuffered = Math.max(0, Math.min(100, ((buffered - seg.start) / (seg.end - seg.start)) * 100));
                                                return (
                                                    <div key={i} className="relative h-full rounded-full overflow-hidden bg-white/20" style={{ width: `${segWidth}%` }}>
                                                        <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: `${segBuffered}%` }} />
                                                        <div className="absolute inset-y-0 left-0 bg-red-500 rounded-full" style={{ width: `${segProgress}%` }} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="absolute bottom-0 left-0 right-0 h-[3px] group-hover/progress:h-[5px] transition-all rounded-full bg-white/20 overflow-hidden">
                                            <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: `${bufPct}%` }} />
                                            <div className="absolute inset-y-0 left-0 bg-red-500 rounded-full" style={{ width: `${pct}%` }} />
                                        </div>
                                    )}

                                    {/* Scrubber dot */}
                                    <div
                                        className="absolute bottom-0 -translate-x-1/2 size-0 group-hover/progress:size-[13px] transition-all rounded-full bg-red-500 shadow-md z-10"
                                        style={{ left: `${pct}%`, bottom: '-2px' }}
                                    />
                                </div>

                                {/* ── Bottom controls row ────────────────────── */}
                                <div className="flex items-center gap-1.5 text-white">
                                    {/* Play / Pause */}
                                    <button onClick={togglePlay} className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
                                        {playing ? <Pause className="size-5 fill-white" /> : <Play className="size-5 fill-white" />}
                                    </button>

                                    {/* Skip back/forward */}
                                    <button onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 10; }} className="p-1.5 hover:bg-white/10 rounded-md transition-colors" title="Back 10s">
                                        <SkipBack className="size-4" />
                                    </button>
                                    <button onClick={() => { if (videoRef.current) videoRef.current.currentTime += 10; }} className="p-1.5 hover:bg-white/10 rounded-md transition-colors" title="Forward 10s">
                                        <SkipForward className="size-4" />
                                    </button>

                                    {/* Volume */}
                                    <button
                                        onClick={() => { const v = videoRef.current; if (v) { v.muted = !v.muted; setMuted(v.muted); } }}
                                        className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
                                    >
                                        {muted || volume === 0 ? <SpeakerX className="size-4" /> : <SpeakerHigh className="size-4" />}
                                    </button>
                                    <input
                                        type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
                                        onChange={e => {
                                            const val = parseFloat(e.target.value);
                                            setVolume(val);
                                            if (videoRef.current) { videoRef.current.volume = val; videoRef.current.muted = val === 0; setMuted(val === 0); }
                                        }}
                                        className="w-16 h-1 accent-white cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                                    />

                                    {/* Time */}
                                    <span className="text-[11px] tabular-nums font-mono text-white/70 ml-1">
                                        {fmtTime(currentTime)} / {fmtTime(duration)}
                                    </span>

                                    <div className="flex-1" />

                                    {/* Quality / Settings */}
                                    {levels.length > 1 && (
                                        <div className="relative">
                                            <button
                                                onClick={() => setSettingsOpen(o => !o)}
                                                className="p-1.5 hover:bg-white/10 rounded-md transition-colors flex items-center gap-1"
                                            >
                                                <GearSix className={cn('size-4 transition-transform', settingsOpen && 'rotate-45')} />
                                                <span className="text-[10px] font-medium">
                                                    {currentLevel === -1
                                                        ? `Auto${activeHeight ? ` ${activeHeight}p` : ''}`
                                                        : `${levels.find(l => l.index === currentLevel)?.height ?? ''}p`}
                                                </span>
                                            </button>
                                            {settingsOpen && (
                                                <div className="absolute bottom-full right-0 mb-2 bg-black/95 backdrop-blur-md rounded-lg border border-white/10 p-1.5 min-w-[140px] flex flex-col gap-0.5 shadow-2xl">
                                                    <p className="px-2.5 pt-1 pb-0.5 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Quality</p>
                                                    <button
                                                        onClick={() => onQualityChange(-1)}
                                                        className={cn(
                                                            'flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-md text-xs transition-colors',
                                                            currentLevel === -1 ? 'bg-white/10 text-white font-semibold' : 'text-gray-300 hover:bg-white/5',
                                                        )}
                                                    >
                                                        Auto
                                                        {currentLevel === -1 && activeHeight && <span className="text-[10px] text-gray-500">{activeHeight}p</span>}
                                                    </button>
                                                    {levels.map(level => (
                                                        <button
                                                            key={level.index}
                                                            onClick={() => onQualityChange(level.index)}
                                                            className={cn(
                                                                'flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-md text-xs transition-colors',
                                                                currentLevel === level.index ? 'bg-white/10 text-white font-semibold' : 'text-gray-300 hover:bg-white/5',
                                                            )}
                                                        >
                                                            {level.height}p
                                                            <span className="text-[10px] text-gray-600">{(level.bitrate / 1_000_000).toFixed(1)}M</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Fullscreen */}
                                    <button onClick={toggleFullscreen} className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
                                        {isFullscreen ? <ArrowsIn className="size-4" /> : <ArrowsOut className="size-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    },
);
