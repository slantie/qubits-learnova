'use client';

import { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LiveWaveformProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onError'> {
    active?: boolean;
    processing?: boolean;
    barWidth?: number;
    barHeight?: number;
    barGap?: number;
    barRadius?: number;
    barColor?: string;
    fadeEdges?: boolean;
    fadeWidth?: number;
    height?: string | number;
    sensitivity?: number;
    smoothingTimeConstant?: number;
    fftSize?: number;
    historySize?: number;
    updateRate?: number;
    mode?: 'scrolling' | 'static';
    onError?: (error: Error) => void;
    onStreamReady?: (stream: MediaStream) => void;
    onStreamEnd?: () => void;
    className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LiveWaveform({
    active = false,
    processing = false,
    barWidth = 3,
    barHeight = 4,
    barGap = 1,
    barRadius = 1.5,
    barColor,
    fadeEdges = true,
    fadeWidth = 24,
    height = 64,
    sensitivity = 1,
    smoothingTimeConstant = 0.8,
    fftSize = 256,
    historySize = 60,
    updateRate = 30,
    mode = 'static',
    onError,
    onStreamReady,
    onStreamEnd,
    className,
    style,
    ...props
}: LiveWaveformProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const historyRef = useRef<number[]>([]);
    const processingPhaseRef = useRef(0);
    const lastDrawRef = useRef(0);

    // ── Cleanup ──────────────────────────────────────────────────────────────
    const cleanup = useCallback(() => {
        if (animFrameRef.current !== null) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
            onStreamEnd?.();
        }
        if (audioCtxRef.current) {
            audioCtxRef.current.close().catch(() => {});
            audioCtxRef.current = null;
        }
        analyserRef.current = null;
    }, [onStreamEnd]);

    // ── Draw helpers ─────────────────────────────────────────────────────────
    const getBarColor = useCallback((canvas: HTMLCanvasElement): string => {
        if (barColor) return barColor;
        const computed = getComputedStyle(canvas).color;
        return computed || '#888';
    }, [barColor]);

    const drawBar = useCallback((
        ctx: CanvasRenderingContext2D,
        x: number, cy: number,
        bw: number, amplitude: number,
        color: string, dpr: number
    ) => {
        const halfH = Math.max(amplitude, 1);
        const r = Math.min(barRadius * dpr, halfH);
        ctx.fillStyle = color;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x, cy - halfH, bw, halfH * 2, r);
        } else {
            ctx.rect(x, cy - halfH, bw, halfH * 2);
        }
        ctx.fill();
    }, [barRadius]);

    const applyFade = useCallback((
        ctx: CanvasRenderingContext2D,
        w: number, h: number
    ) => {
        if (!fadeEdges) return;
        const fw = Math.min(fadeWidth, w / 3);
        const leftGrad = ctx.createLinearGradient(0, 0, fw, 0);
        leftGrad.addColorStop(0, 'rgba(0,0,0,1)');
        leftGrad.addColorStop(1, 'rgba(0,0,0,0)');
        const rightGrad = ctx.createLinearGradient(w - fw, 0, w, 0);
        rightGrad.addColorStop(0, 'rgba(0,0,0,0)');
        rightGrad.addColorStop(1, 'rgba(0,0,0,1)');

        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = leftGrad;
        ctx.fillRect(0, 0, fw, h);
        ctx.fillStyle = rightGrad;
        ctx.fillRect(w - fw, 0, fw, h);
        ctx.globalCompositeOperation = 'source-over';
    }, [fadeEdges, fadeWidth]);

    // ── Static mode draw ─────────────────────────────────────────────────────
    const drawStatic = useCallback((
        ctx: CanvasRenderingContext2D,
        data: Uint8Array,
        w: number, h: number,
        color: string, dpr: number
    ) => {
        ctx.clearRect(0, 0, w, h);
        const cy = h / 2;
        const bw = barWidth * dpr;
        const gap = barGap * dpr;
        const step = bw + gap;
        const numBars = Math.floor(w / step);
        const bucketSize = Math.floor(data.length / numBars);

        for (let i = 0; i < numBars; i++) {
            let sum = 0;
            const start = i * bucketSize;
            for (let j = 0; j < bucketSize; j++) sum += data[start + j];
            const avg = sum / bucketSize;
            const normalized = (avg / 255) * sensitivity;
            const amplitude = normalized * (h / 2 - barHeight * dpr) * barHeight + barHeight * dpr;
            drawBar(ctx, i * step, cy, bw, amplitude, color, dpr);
        }
        applyFade(ctx, w, h);
    }, [barWidth, barGap, barHeight, sensitivity, drawBar, applyFade]);

    // ── Scrolling mode draw ──────────────────────────────────────────────────
    const drawScrolling = useCallback((
        ctx: CanvasRenderingContext2D,
        data: Uint8Array,
        w: number, h: number,
        color: string, dpr: number
    ) => {
        const avg = data.reduce((s, v) => s + v, 0) / data.length;
        const normalized = (avg / 255) * sensitivity;
        historyRef.current.push(normalized);
        if (historyRef.current.length > historySize) {
            historyRef.current.shift();
        }

        ctx.clearRect(0, 0, w, h);
        const cy = h / 2;
        const bw = barWidth * dpr;
        const gap = barGap * dpr;
        const step = bw + gap;
        const hist = historyRef.current;

        for (let i = 0; i < hist.length; i++) {
            const x = w - (hist.length - i) * step;
            if (x < 0) continue;
            const amplitude = hist[i] * (h / 2 - barHeight * dpr) * barHeight + barHeight * dpr;
            drawBar(ctx, x, cy, bw, amplitude, color, dpr);
        }
        applyFade(ctx, w, h);
    }, [barWidth, barGap, barHeight, sensitivity, historySize, drawBar, applyFade]);

    // ── Processing animation draw ────────────────────────────────────────────
    const drawProcessing = useCallback((
        ctx: CanvasRenderingContext2D,
        w: number, h: number,
        color: string, dpr: number,
        phase: number
    ) => {
        ctx.clearRect(0, 0, w, h);
        const cy = h / 2;
        const bw = barWidth * dpr;
        const gap = barGap * dpr;
        const step = bw + gap;
        const numBars = Math.floor(w / step);

        for (let i = 0; i < numBars; i++) {
            const wave = Math.sin((i / numBars) * Math.PI * 4 + phase);
            const amplitude = ((wave + 1) / 2) * (h / 2 - barHeight * dpr) * 0.6 + barHeight * dpr;
            drawBar(ctx, i * step, cy, bw, amplitude, color, dpr);
        }
        applyFade(ctx, w, h);
    }, [barWidth, barGap, barHeight, drawBar, applyFade]);

    // ── Idle draw ────────────────────────────────────────────────────────────
    const drawIdle = useCallback((
        ctx: CanvasRenderingContext2D,
        w: number, h: number,
        color: string, dpr: number
    ) => {
        ctx.clearRect(0, 0, w, h);
        const cy = h / 2;
        const bw = barWidth * dpr;
        const gap = barGap * dpr;
        const step = bw + gap;
        const numBars = Math.floor(w / step);
        for (let i = 0; i < numBars; i++) {
            drawBar(ctx, i * step, cy, bw, barHeight * dpr, color, dpr);
        }
        applyFade(ctx, w, h);
    }, [barWidth, barGap, barHeight, drawBar, applyFade]);

    // ── Animation loop ───────────────────────────────────────────────────────
    const startLoop = useCallback((canvas: HTMLCanvasElement, analyser: AnalyserNode) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const data = new Uint8Array(analyser.frequencyBinCount);

        const loop = (now: number) => {
            animFrameRef.current = requestAnimationFrame(loop);
            if (now - lastDrawRef.current < updateRate) return;
            lastDrawRef.current = now;

            const dpr = window.devicePixelRatio || 1;
            const w = canvas.width;
            const h = canvas.height;
            const color = getBarColor(canvas);

            analyser.getByteFrequencyData(data);
            if (mode === 'scrolling') {
                drawScrolling(ctx, data, w, h, color, dpr);
            } else {
                drawStatic(ctx, data, w, h, color, dpr);
            }
        };
        animFrameRef.current = requestAnimationFrame(loop);
    }, [mode, updateRate, getBarColor, drawStatic, drawScrolling]);

    const startProcessingLoop = useCallback((canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const loop = (now: number) => {
            animFrameRef.current = requestAnimationFrame(loop);
            if (now - lastDrawRef.current < updateRate) return;
            lastDrawRef.current = now;

            processingPhaseRef.current += 0.06;
            const dpr = window.devicePixelRatio || 1;
            const color = getBarColor(canvas);
            drawProcessing(ctx, canvas.width, canvas.height, color, dpr, processingPhaseRef.current);
        };
        animFrameRef.current = requestAnimationFrame(loop);
    }, [updateRate, getBarColor, drawProcessing]);

    // ── Resize canvas to display size ────────────────────────────────────────
    const resizeCanvas = useCallback((canvas: HTMLCanvasElement) => {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const w = Math.round(rect.width * dpr);
        const h = Math.round(rect.height * dpr);
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
    }, []);

    // ── Effect: start/stop mic ───────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        if (!active && !processing) {
            cleanup();
            resizeCanvas(canvas);
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const dpr = window.devicePixelRatio || 1;
                drawIdle(ctx, canvas.width, canvas.height, getBarColor(canvas), dpr);
            }
            return;
        }

        if (processing && !active) {
            cleanup();
            resizeCanvas(canvas);
            startProcessingLoop(canvas);
            return;
        }

        // active = true — start microphone
        let cancelled = false;
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(stream => {
                if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
                streamRef.current = stream;
                onStreamReady?.(stream);

                const audioCtx = new AudioContext();
                audioCtxRef.current = audioCtx;
                const source = audioCtx.createMediaStreamSource(stream);
                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = fftSize;
                analyser.smoothingTimeConstant = smoothingTimeConstant;
                source.connect(analyser);
                analyserRef.current = analyser;

                resizeCanvas(canvas);
                startLoop(canvas, analyser);
            })
            .catch(err => {
                if (cancelled) return;
                onError?.(err instanceof Error ? err : new Error(String(err)));
            });

        return () => {
            cancelled = true;
            cleanup();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, processing]);

    // ── Resize observer ──────────────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ro = new ResizeObserver(() => {
            resizeCanvas(canvas);
        });
        ro.observe(canvas);
        return () => ro.disconnect();
    }, [resizeCanvas]);

    const heightStyle = typeof height === 'number' ? `${height}px` : height;

    return (
        <div
            className={cn('relative w-full overflow-hidden', className)}
            style={{ height: heightStyle, ...style }} // dynamic prop — cannot use static Tailwind class
            {...props}
        >
            <canvas
                ref={canvasRef}
                className="block w-full h-full"
            />
        </div>
    );
}
