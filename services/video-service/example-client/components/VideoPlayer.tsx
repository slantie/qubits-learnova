'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';

interface QualityLevel {
  index: number;
  height: number;
  width: number;
  bitrate: number;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
}

export default function VideoPlayer({ src, poster }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 = Auto
  const [activeHeight, setActiveHeight] = useState<number | null>(null);

  const onQualityChange = useCallback((index: number) => {
    const hls = hlsRef.current;
    if (!hls) return;

    // -1 = auto, otherwise specific level index
    hls.currentLevel = index;
    setCurrentLevel(index);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setLevels([]);
    setCurrentLevel(-1);
    setActiveHeight(null);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        const qualityLevels: QualityLevel[] = data.levels.map((level, index) => ({
          index,
          height: level.height,
          width: level.width,
          bitrate: level.bitrate,
        }));

        // Sort by height descending (1080p first)
        qualityLevels.sort((a, b) => b.height - a.height);
        setLevels(qualityLevels);

        video.play().catch(() => {});
      });

      // Track which level hls.js is actually rendering
      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        const level = hls.levels[data.level];
        if (level) {
          setActiveHeight(level.height);
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
      });
    }
  }, [src]);

  function formatBitrate(bps: number) {
    return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  }

  return (
    <div style={{ position: 'relative', backgroundColor: '#000' }}>
      <video
        ref={videoRef}
        poster={poster}
        controls
        playsInline
        style={{
          width: '100%',
          maxHeight: '500px',
          display: 'block',
          backgroundColor: '#000',
        }}
      />

      {/* Quality selector */}
      {levels.length > 1 && (
        <div
          style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            borderRadius: '8px',
            padding: '0.5rem',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span
            style={{
              fontSize: '0.65rem',
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.25rem',
              paddingLeft: '0.25rem',
            }}
          >
            Quality
          </span>

          {/* Auto option */}
          <button
            onClick={() => onQualityChange(-1)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              padding: '0.35rem 0.5rem',
              backgroundColor: currentLevel === -1 ? 'rgba(37, 99, 235, 0.3)' : 'transparent',
              border: currentLevel === -1 ? '1px solid rgba(37, 99, 235, 0.5)' : '1px solid transparent',
              borderRadius: '4px',
              color: currentLevel === -1 ? '#60a5fa' : '#ccc',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: currentLevel === -1 ? 700 : 400,
              textAlign: 'left',
            }}
          >
            <span>Auto</span>
            {currentLevel === -1 && activeHeight && (
              <span style={{ fontSize: '0.7rem', color: '#888' }}>{activeHeight}p</span>
            )}
          </button>

          {/* Quality levels */}
          {levels.map((level) => {
            const isSelected = currentLevel === level.index;
            const isActive = activeHeight === level.height;

            return (
              <button
                key={level.index}
                onClick={() => onQualityChange(level.index)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.35rem 0.5rem',
                  backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.3)' : 'transparent',
                  border: isSelected ? '1px solid rgba(37, 99, 235, 0.5)' : '1px solid transparent',
                  borderRadius: '4px',
                  color: isSelected ? '#60a5fa' : '#ccc',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: isSelected ? 700 : 400,
                  textAlign: 'left',
                }}
              >
                <span>
                  {level.height}p
                  {isActive && currentLevel === -1 && (
                    <span style={{ color: '#22c55e', marginLeft: '0.35rem', fontSize: '0.6rem' }}>
                      ●
                    </span>
                  )}
                </span>
                <span style={{ fontSize: '0.65rem', color: '#666' }}>
                  {formatBitrate(level.bitrate)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Current quality indicator */}
      {activeHeight && (
        <div
          style={{
            position: 'absolute',
            bottom: '3.5rem',
            left: '0.5rem',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.7rem',
            color: '#888',
            pointerEvents: 'none',
          }}
        >
          {activeHeight}p {currentLevel === -1 ? '(auto)' : ''}
        </div>
      )}
    </div>
  );
}
