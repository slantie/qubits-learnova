'use client';

import { useState } from 'react';
import UploadForm from '@/components/UploadForm';
import VideoList from '@/components/VideoList';
import VideoPlayer from '@/components/VideoPlayer';

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

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  return (
    <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
          Learnova Video Service
        </h1>
        <p style={{ color: '#888', marginTop: '0.25rem', fontSize: '0.9rem' }}>
          Upload, process, and stream videos with HLS adaptive bitrate
        </p>
      </div>

      {/* Upload */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          Upload Video
        </h2>
        <UploadForm onUploadComplete={() => setRefreshKey((k) => k + 1)} />
      </section>

      {/* Player */}
      {selectedVideo && (
        <section
          style={{
            marginBottom: '2rem',
            border: '1px solid #333',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#111',
          }}
        >
          <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>
                Now Playing: {selectedVideo.originalName}
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>
                {selectedVideo.duration ? `${Math.floor(selectedVideo.duration / 60)}:${Math.floor(selectedVideo.duration % 60).toString().padStart(2, '0')}` : ''}{' '}
                &middot; {selectedVideo.videoId}
              </p>
            </div>
            <button
              onClick={() => setSelectedVideo(null)}
              style={{
                padding: '0.3rem 0.75rem',
                backgroundColor: 'transparent',
                color: '#888',
                border: '1px solid #444',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              Close
            </button>
          </div>
          <VideoPlayer
            src={selectedVideo.streamUrl!}
            poster={selectedVideo.thumbnailUrl || undefined}
          />
        </section>
      )}

      {/* Video list */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Videos</h2>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            style={{
              padding: '0.3rem 0.75rem',
              backgroundColor: 'transparent',
              color: '#888',
              border: '1px solid #333',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            Refresh
          </button>
        </div>
        <VideoList refreshKey={refreshKey} onSelectVideo={setSelectedVideo} />
      </section>

      {/* Info */}
      <footer style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #222', color: '#555', fontSize: '0.8rem' }}>
        <p>
          Video service: <code>http://localhost:4001</code> &middot;
          MinIO console: <a href="http://localhost:9001" target="_blank" rel="noreferrer">localhost:9001</a> &middot;
          Playback powered by <a href="https://github.com/video-dev/hls.js" target="_blank" rel="noreferrer">hls.js</a>
        </p>
      </footer>
    </main>
  );
}
