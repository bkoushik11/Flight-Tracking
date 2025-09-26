import React, { useEffect, useRef, useState } from 'react';

interface RecordingPlayerProps {
  src: string;
  className?: string;
}

const RecordingPlayer: React.FC<RecordingPlayerProps> = ({ src, className }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  // Fetch as blob and play via Object URL to avoid any Range/codec negotiation quirks
  useEffect(() => {
    let revokeTimer: any;
    const load = async () => {
      try {
        setError(null);
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          setObjectUrl(null);
        }
        const res = await fetch(src, { method: 'GET', mode: 'cors' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setObjectUrl(url);
        // Small delay to ensure video element picks up new src
        revokeTimer = setTimeout(() => {
          // Leave cleanup to next change/unmount
        }, 0);
      } catch (e: any) {
        // eslint-disable-next-line no-console
        console.error('RecordingPlayer blob load failed', e);
        setError('Failed to load video');
      }
    };
    load();
    return () => {
      if (revokeTimer) clearTimeout(revokeTimer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);
  return (
    <div className={`rounded-lg border border-slate-700 bg-slate-900/40 p-3 ${className || ''}`}>
      <video
        key={src}
        ref={videoRef}
        className="w-full rounded"
        controls
        playsInline
        crossOrigin="anonymous"
        preload="metadata"
        onError={() => setError('Failed to load video')}
      >
        <source src={objectUrl || src} type="video/webm" />
      </video>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        <span>{error ? error : 'HTML5 Player'}</span>
        <a href={src} download className="px-2 py-1 rounded border border-green-400/40 text-green-300">Download</a>
      </div>
    </div>
  );
};

export default RecordingPlayer;


