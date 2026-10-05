import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Plus, Clock, FileText, Video, Loader2, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../lib/AuthContext';

interface Meeting {
  _id: string;
  title: string;
  platform: string;
  status: string;
  duration: number;
  createdAt: string;
  summary?: { overview?: string };
}

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('manual');

  const fetchMeetings = async () => {
    try {
      const { data } = await api.get('/meetings');
      setMeetings(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      await api.post('/meetings', { title, platform });
      setShowModal(false);
      setTitle('');
      await fetchMeetings();
      await refreshUser();
      // Poll for processing completion
      setTimeout(fetchMeetings, 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create meeting');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this meeting?')) return;
    await api.delete(`/meetings/${id}`);
    setMeetings((m) => m.filter((x) => x._id !== id));
  };

  const formatDuration = (s: number) => {
    if (!s) return '—';
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  };

  const statusColor: Record<string, string> = {
    completed: 'text-green-400 bg-green-400/10',
    processing: 'text-yellow-400 bg-yellow-400/10',
    recording: 'text-red-400 bg-red-400/10',
    scheduled: 'text-slate-400 bg-slate-400/10',
    failed: 'text-red-500 bg-red-500/10'
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="font-display text-3xl font-bold">Dashboard</h1>
          <p className="text-slate-400 mt-1">
            {user?.meetingsUsedThisMonth ?? 0} / {user?.meetingsLimit ?? 3} meetings this month
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-purple font-semibold text-slate-950 hover:opacity-90 transition shadow-lg shadow-neon-purple/20"
        >
          <Plus className="w-5 h-5" />
          New Meeting
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[
          { label: 'Total Meetings', value: meetings.length, icon: Video },
          { label: 'This Month', value: user?.meetingsUsedThisMonth ?? 0, icon: Clock },
          { label: 'Plan', value: (user?.plan || 'free').toUpperCase(), icon: FileText }
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
              <stat.icon className="w-6 h-6 text-neon-cyan" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-slate-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Meetings list */}
      <h2 className="font-semibold text-lg mb-4">Recent Meetings</h2>
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <Mic className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">No meetings yet. Record your first one!</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm"
          >
            Start recording
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {meetings.map((m) => (
              <motion.div
                key={m._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass rounded-2xl p-5 flex items-center gap-4 hover:border-neon-purple/30 transition group"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                  <Video className="w-6 h-6 text-neon-cyan" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/app/meetings/${m._id}`} className="font-medium hover:text-neon-cyan transition truncate block">
                    {m.title}
                  </Link>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="capitalize">{m.platform}</span>
                    <span>•</span>
                    <span>{formatDuration(m.duration)}</span>
                    <span>•</span>
                    <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColor[m.status] || statusColor.scheduled}`}>
                  {m.status}
                </span>
                <button
                  onClick={() => handleDelete(m._id)}
                  className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md glass-strong rounded-3xl p-6"
            >
              <h3 className="font-display text-xl font-bold mb-5">New Meeting</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Weekly standup"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 focus:border-neon-cyan/50 focus:outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Platform</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 focus:border-neon-cyan/50 focus:outline-none"
                  >
                    <option value="manual">Manual / Upload</option>
                    <option value="zoom">Zoom</option>
                    <option value="google">Google Meet</option>
                    <option value="teams">Microsoft Teams</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 rounded-xl glass hover:bg-white/5 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={creating || !title.trim()}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-purple font-semibold text-slate-950 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                    {creating ? 'Recording…' : 'Start'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
