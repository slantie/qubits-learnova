'use client';

import { useState, useRef } from 'react';

const VIDEO_SERVICE_URL = 'http://localhost:4001/api';

interface UploadFormProps {
  onUploadComplete: () => void;
}

export default function UploadForm({ onUploadComplete }: UploadFormProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage('');

    try {
      setProgress('Getting auth token...');
      const tokenRes = await fetch('/api/token');
      const { token } = await tokenRes.json();

      setProgress(`Uploading ${(file.size / 1_000_000).toFixed(1)} MB...`);
      const formData = new FormData();
      formData.append('video', file);
      formData.append('autoProcess', 'true');

      // Upload directly to the video service (bypasses Next.js proxy size limits)
      const uploadRes = await fetch(`${VIDEO_SERVICE_URL}/videos/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        throw new Error(errorText || `Upload failed with status ${uploadRes.status}`);
      }

      const data = await uploadRes.json();
      setMessage(`Uploaded! Video ID: ${data.videoId} — Processing started.`);
      setProgress('');
      if (fileRef.current) fileRef.current.value = '';
      onUploadComplete();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
      setProgress('');
    }

    setUploading(false);
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-matroska"
          required
          disabled={uploading}
          style={{
            padding: '0.5rem',
            border: '1px solid #333',
            borderRadius: '6px',
            backgroundColor: '#111',
            color: '#fff',
            flex: 1,
            minWidth: '200px',
          }}
        />
        <button
          type="submit"
          disabled={uploading}
          style={{
            padding: '0.6rem 1.5rem',
            backgroundColor: uploading ? '#333' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          {uploading ? 'Uploading...' : 'Upload Video'}
        </button>
      </div>
      {progress && (
        <p style={{ marginTop: '0.5rem', color: '#888', fontSize: '0.8rem' }}>{progress}</p>
      )}
      {message && (
        <p
          style={{
            marginTop: '0.5rem',
            color: message.startsWith('Error') ? '#ef4444' : '#22c55e',
            fontSize: '0.875rem',
          }}
        >
          {message}
        </p>
      )}
    </form>
  );
}
