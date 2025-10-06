import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { recordingService, RecordingMeta } from '../services/recordingService';

import RecordingPlayer from '../components/RecordingPlayer';



interface RecordingsPageProps {

  onBack: () => void;

}



const RecordingsPage: React.FC<RecordingsPageProps> = ({ onBack }) => {
  const navigate = useNavigate();

  const [items, setItems] = useState<RecordingMeta[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [openId, setOpenId] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);



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



  const handleDelete = async (id: string, title: string) => {

    // Confirm deletion

    if (!window.confirm(`Are you sure you want to delete the recording "${title}"? This action cannot be undone.`)) {

      return;

    }



    try {

      setDeletingId(id);

      await recordingService.deleteRecording(id);

      

      // Remove the deleted item from the list

      setItems(prevItems => prevItems.filter(item => item._id !== id));

      

      // Close the player if it was open for this recording

      if (openId === id) {

        setOpenId(null);

      }

      

      // Show success message

      alert('Recording deleted successfully');

    } catch (e: any) {

      setError(e.message || 'Failed to delete recording');

    } finally {

      setDeletingId(null);

    }

  };

  const handleBack = () => {
    navigate('/');
  };



  return (

    <div className="min-h-screen bg-slate-950 text-cyan-100 p-4">

      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-4">

          <h1 className="text-2xl font-semibold text-white">Your Recordings</h1>

          <button onClick={handleBack} className="px-4 py-2 border border-cyan-400/50 rounded-lg text-cyan-300 hover:bg-cyan-500/10 transition-colors">Back</button>

        </div>

        {loading && <div className="text-cyan-200">Loading...</div>}

        {error && <div className="text-red-400">{error}</div>}

        <div className="columns-1 md:columns-2 gap-4">

          {items.map((item, idx) => (

            <div key={item._id} className="mb-4 break-inside-avoid p-3 border border-slate-700 rounded-lg bg-slate-900/40 backdrop-blur-sm">

              <div className="flex items-center justify-between">

                <div className="min-w-0 flex-1">

                  <button

                    type="button"

                    onClick={() => setOpenId(prev => (prev === item._id ? null : item._id))}

                    className="font-medium text-left hover:underline focus:underline cursor-pointer inline-flex items-center gap-2 text-white w-full"

                  >

                    <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full bg-slate-800 border border-slate-600 text-cyan-200 flex-shrink-0">{idx + 1}</span>

                    <span className="truncate text-sm">{item.title}</span>

                  </button>

                  <div className="text-xs text-cyan-300">{new Date(item.createdAt).toLocaleString()}</div>

                </div>

                <div className="flex gap-2 ml-2 flex-shrink-0">

                  <button

                    onClick={() => setOpenId(prev => (prev === item._id ? null : item._id))}

                    className="px-3 py-1 text-sm border border-green-400/50 rounded text-green-300 hover:bg-green-500/10 transition-colors"

                  >

                    {openId === item._id ? 'Hide' : 'Play'}

                  </button>

                  <button

                    onClick={() => handleDelete(item._id, item.title)}

                    disabled={deletingId === item._id}

                    className="px-3 py-1 text-sm border border-red-400/50 rounded text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50"

                  >

                    {deletingId === item._id ? 'Deleting...' : 'Delete'}

                  </button>

                </div>

              </div>

              {openId === item._id && (

                <div className="mt-3">

                  <RecordingPlayer src={recordingService.getStreamUrl(item._id)} />

                </div>

              )}

            </div>

          ))}

          {!loading && !error && items.length === 0 && (

            <div className="text-cyan-300">No recordings found.</div>

          )}

        </div>

      </div>

    </div>

  );

};



export default RecordingsPage;