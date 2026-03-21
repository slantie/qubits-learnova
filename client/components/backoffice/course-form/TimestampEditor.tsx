'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Clock, GripVertical } from 'lucide-react';

export interface Timestamp {
    time: number;
    label: string;
    description?: string;
}

interface TimestampEditorProps {
    timestamps: Timestamp[];
    onChange: (timestamps: Timestamp[]) => void;
    videoDuration?: number | null;
    onSeek?: (time: number) => void;
}

function formatTime(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function parseTimeInput(value: string): number | null {
    const parts = value.split(':').map(Number);
    if (parts.some(isNaN)) return null;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return null;
}

function TimestampRow({
    ts,
    index,
    onUpdate,
    onDelete,
    onSeek,
}: {
    ts: Timestamp;
    index: number;
    onUpdate: (index: number, updated: Timestamp) => void;
    onDelete: (index: number) => void;
    onSeek?: (time: number) => void;
}) {
    const [timeStr, setTimeStr] = useState(formatTime(ts.time));

    const handleTimeBlur = () => {
        const parsed = parseTimeInput(timeStr);
        if (parsed !== null && parsed >= 0) {
            onUpdate(index, { ...ts, time: parsed });
            setTimeStr(formatTime(parsed));
        } else {
            setTimeStr(formatTime(ts.time));
        }
    };

    return (
        <div className="flex items-start gap-2 group">
            <div className="pt-2 text-muted-foreground/40">
                <GripVertical className="size-4" />
            </div>

            <button
                type="button"
                onClick={() => onSeek?.(ts.time)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-muted text-xs font-mono tabular-nums hover:bg-muted/80 transition-colors shrink-0 mt-0.5"
                title="Jump to this time"
            >
                <Clock className="size-3 text-muted-foreground" />
                <input
                    type="text"
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value)}
                    onBlur={handleTimeBlur}
                    onKeyDown={(e) => e.key === 'Enter' && handleTimeBlur()}
                    onClick={(e) => e.stopPropagation()}
                    className="w-16 bg-transparent text-center text-xs font-mono outline-none"
                    placeholder="0:00"
                />
            </button>

            <div className="flex-1 flex flex-col gap-1">
                <Input
                    value={ts.label}
                    onChange={(e) => onUpdate(index, { ...ts, label: e.target.value })}
                    placeholder="Chapter title"
                    className="h-8 text-sm"
                />
                <Input
                    value={ts.description ?? ''}
                    onChange={(e) => onUpdate(index, { ...ts, description: e.target.value || undefined })}
                    placeholder="Description (optional)"
                    className="h-7 text-xs text-muted-foreground"
                />
            </div>

            <button
                type="button"
                onClick={() => onDelete(index)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 mt-0.5"
                title="Remove timestamp"
            >
                <Trash2 className="size-4" />
            </button>
        </div>
    );
}

export function TimestampEditor({ timestamps, onChange, videoDuration, onSeek }: TimestampEditorProps) {
    const sorted = [...timestamps].sort((a, b) => a.time - b.time);

    const handleAdd = () => {
        const lastTime = sorted.length > 0 ? sorted[sorted.length - 1].time + 30 : 0;
        const newTime = videoDuration ? Math.min(lastTime, videoDuration) : lastTime;
        onChange([...timestamps, { time: newTime, label: '', description: undefined }]);
    };

    const handleUpdate = (index: number, updated: Timestamp) => {
        const next = [...timestamps];
        next[index] = updated;
        onChange(next);
    };

    const handleDelete = (index: number) => {
        onChange(timestamps.filter((_, i) => i !== index));
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium flex items-center gap-1.5">
                    <Clock className="size-4 text-muted-foreground" />
                    Timestamps / Chapters
                </p>
                <Button type="button" variant="outline" size="sm" onClick={handleAdd} className="h-7 text-xs">
                    <Plus className="size-3 mr-1" /> Add
                </Button>
            </div>

            {timestamps.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                    No timestamps yet. Add chapter markers so learners can jump to specific sections.
                </p>
            ) : (
                <div className="flex flex-col gap-2">
                    {sorted.map((ts, i) => (
                        <TimestampRow
                            key={i}
                            ts={ts}
                            index={timestamps.indexOf(ts)}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                            onSeek={onSeek}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
