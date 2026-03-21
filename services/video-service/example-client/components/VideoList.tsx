'use client';

import { useState, useEffect, useCallback } from 'react';
import { listVideosAction, deleteVideoAction, getVideoAction } from '@/app/actions';

interface Video {
  videoId: string;
  status: string;
  duration: number | null;
  thumbnailUrl: string | null;
  streamUrl: string | null;
  originalName: string;
  fileSize: string;
  createdAt: string;
}

interface VideoListProps {
  refreshKey: number;
  onSelectVideo: (video: Video) => void;
}

export default function VideoList({ refreshKey, onSelectVideo }: VideoListProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    const result = await listVideosAction();
    if (result.success) {
      setVideos(result.data.videos);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos, refreshKey]);

  // Poll processing videos every 3 seconds
  useEffect(() => {
    const processing = videos.some((v) => v.status === 'PROCESSING' || v.status === 'UPLOADED');
    if (!processing) return;

    const interval = setInterval(async () => {
      const updated = await Promise.all(
        videos.map(async (v) => {
          if (v.status === 'PROCESSING' || v.status === 'UPLOADED') {
            const res = await getVideoAction(v.videoId);
            return res.success ? res.data : v;
          }
          return v;
        })
      );
      setVideos(updated);
    }, 3000);

    return () => clearInterval(interval);
  }, [videos]);

  async function handleDelete(videoId: string) {
    if (!confirm('Delete this video?')) return;
    await deleteVideoAction(videoId);
    fetchVideos();
  }

  function formatDuration(seconds: number | null) {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function formatSize(bytes: string) {
    const n = parseInt(bytes);
    if (n > 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} GB`;
    if (n > 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
    return `${(n / 1_000).toFixed(0)} KB`;
  }

  const statusColors: Record<string, string> = {
    UPLOADING: '#f59e0b',
    UPLOADED: '#3b82f6',
    PROCESSING: '#a855f7',
    READY: '#22c55e',
    FAILED: '#ef4444',
  };

  if (loading) return <p style={{ color: '#888' }}>Loading videos...</p>;
  if (videos.length === 0) return <p style={{ color: '#888' }}>No videos yet. Upload one above.</p>;

  return (
    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
      {videos.map((video) => (
        <div
          key={video.videoId}
          style={{
            border: '1px solid #333',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#111',
          }}
        >
          {/* Thumbnail / placeholder */}
          <div
            style={{
              height: '170px',
              backgroundColor: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: video.status === 'READY' ? 'pointer' : 'default',
              position: 'relative',
            }}
            onClick={() => video.status === 'READY' && onSelectVideo(video)}
          >
            {video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl}
                alt={video.originalName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ color: '#555', fontSize: '2rem' }}>
                {video.status === 'PROCESSING' ? '⏳' : video.status === 'FAILED' ? '⚠️' : '🎬'}
              </span>
            )}
            {video.status === 'READY' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
              >
                <span style={{ fontSize: '3rem' }}>▶</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ padding: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '0.5rem' }}>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: 0, wordBreak: 'break-all' }}>
                {video.originalName}
              </p>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  backgroundColor: statusColors[video.status] || '#666',
                  color: '#fff',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {video.status}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', color: '#888', fontSize: '0.8rem' }}>
              <span>{formatDuration(video.duration)}</span>
              <span>{formatSize(video.fileSize)}</span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              {video.status === 'READY' && (
                <button
                  onClick={() => onSelectVideo(video)}
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  Play
                </button>
              )}
              <button
                onClick={() => handleDelete(video.videoId)}
                style={{
                  padding: '0.4rem 0.75rem',
                  backgroundColor: 'transparent',
                  color: '#ef4444',
                  border: '1px solid #ef4444',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
