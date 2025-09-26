import React, { useEffect, useState } from 'react';
import { recordingService, RecordingMeta } from '../services/recordingService';
import RecordingPlayer from '../components/RecordingPlayer';

interface RecordingsPageProps {
  onBack: () => void;
}

const RecordingsPage: React.FC<RecordingsPageProps> = ({ onBack }) => {
  const [items, setItems] = useState<RecordingMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await recordingService.listRecordings();
        setItems(res.data);
      } catch (e: any) {
        setError(e.message || 'Failed to load recordings');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Your Recordings</h1>
          <button onClick={onBack} className="px-4 py-2 border border-cyan-400/50 rounded-lg text-cyan-300">Back</button>
        </div>
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-400">{error}</div>}
        <div className="columns-1 md:columns-2 gap-4">
          {items.map((item, idx) => (
            <div key={item._id} className="mb-4 break-inside-avoid p-3 border border-slate-700 rounded-lg bg-slate-900/40">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => setOpenId(prev => (prev === item._id ? null : item._id))}
                    className="font-medium text-left hover:underline focus:underline cursor-pointer inline-flex items-center gap-2"
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full bg-slate-800 border border-slate-600 text-slate-200">{idx + 1}</span>
                    <span className="truncate">{item.title}</span>
                  </button>
                  <div className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</div>
                </div>
                <button
                  onClick={() => setOpenId(prev => (prev === item._id ? null : item._id))}
                  className="px-3 py-1 text-sm border border-green-400/50 rounded text-green-300"
                >
                  {openId === item._id ? 'Hide' : 'Play'}
                </button>
              </div>
              {openId === item._id && (
                <div className="mt-3">
                  <RecordingPlayer src={recordingService.getStreamUrl(item._id)} />
                </div>
              )}
            </div>
          ))}
          {!loading && !error && items.length === 0 && (
            <div className="text-slate-400">No recordings found.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordingsPage;


