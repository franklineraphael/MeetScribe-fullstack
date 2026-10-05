import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, CheckCircle2, Circle, Users, ListChecks, Lightbulb } from 'lucide-react';
import api from '../lib/api';

interface Meeting {
  _id: string;
  title: string;
  platform: string;
  status: string;
  duration: number;
  transcript?: {
    raw: string;
    segments: { speaker: string; text: string; start: number; end: number }[];
  };
  summary?: {
    overview: string;
    keyPoints: string[];
    actionItems: { text: string; assignee: string; dueDate: string; completed: boolean }[];
    decisions: string[];
    participants: string[];
  };
  notes?: string;
  createdAt: string;
}

export default function MeetingDetail() {
  const { id } = useParams();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'summary' | 'transcript' | 'notes'>('summary');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/meetings/${id}`);
        setMeeting(data.data);
        setNotes(data.data.notes || '');
        if (data.data.status === 'recording' || data.data.status === 'processing') {
          setTimeout(load, 2000);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const saveNotes = async () => {
    await api.put(`/meetings/${id}`, { notes });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
      </div>
    );
  }

  if (!meeting) {
    return <div className="p-8 text-center text-slate-400">Meeting not found</div>;
  }

  const isProcessing = meeting.status === 'recording' || meeting.status === 'processing';

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link to="/app" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold mb-2">{meeting.title}</h1>
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span className="capitalize">{meeting.platform}</span>
            <span>•</span>
            <span>{Math.floor((meeting.duration || 0) / 60)}m</span>
            <span>•</span>
            <span className={`capitalize px-2 py-0.5 rounded-full text-xs ${
              meeting.status === 'completed' ? 'bg-green-400/10 text-green-400' : 'bg-yellow-400/10 text-yellow-400'
            }`}>
              {meeting.status}
            </span>
          </div>
        </div>
      </div>

      {isProcessing ? (
        <div className="glass rounded-2xl p-16 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-neon-cyan mx-auto mb-4" />
          <p className="text-lg font-medium">Processing your meeting…</p>
          <p className="text-slate-400 text-sm mt-2">Transcription & summary will appear shortly</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {(['summary', 'transcript', 'notes'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition ${
                  tab === t
                    ? 'bg-gradient-to-r from-neon-cyan/20 to-neon-purple/20 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'summary' && meeting.summary && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="glass rounded-2xl p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-neon-cyan" /> Overview
                </h3>
                <p className="text-slate-300 leading-relaxed">{meeting.summary.overview}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="glass rounded-2xl p-6">
                  <h3 className="font-semibold mb-4">Key Points</h3>
                  <ul className="space-y-3">
                    {meeting.summary.keyPoints?.map((kp, i) => (
                      <li key={i} className="flex gap-3 text-sm text-slate-300">
                        <span className="text-neon-cyan font-bold">{i + 1}.</span>
                        {kp}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="glass rounded-2xl p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <ListChecks className="w-5 h-5 text-neon-purple" /> Action Items
                  </h3>
                  <ul className="space-y-3">
                    {meeting.summary.actionItems?.map((ai, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        {ai.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-500 shrink-0" />
                        )}
                        <div>
                          <p className="text-slate-300">{ai.text}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {ai.assignee} · due {new Date(ai.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="glass rounded-2xl p-6">
                <h3 className="font-semibold mb-3">Decisions</h3>
                <ul className="space-y-2">
                  {meeting.summary.decisions?.map((d, i) => (
                    <li key={i} className="text-sm text-slate-300 flex gap-2">
                      <span className="text-neon-pink">→</span> {d}
                    </li>
                  ))}
                </ul>
              </div>

              {meeting.summary.participants && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-neon-cyan" /> Participants
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {meeting.summary.participants.map((p) => (
                      <span key={p} className="px-3 py-1 rounded-full bg-slate-800 text-sm">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {tab === 'transcript' && meeting.transcript && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-6 space-y-4">
              {meeting.transcript.segments?.map((seg, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-20 shrink-0">
                    <span className="text-xs font-medium text-neon-cyan">{seg.speaker}</span>
                    <p className="text-[10px] text-slate-600">{Math.floor(seg.start / 60)}:{String(seg.start % 60).padStart(2, '0')}</p>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{seg.text}</p>
                </div>
              ))}
            </motion.div>
          )}

          {tab === 'notes' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-6">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={saveNotes}
                rows={12}
                placeholder="Add your personal notes here…"
                className="w-full bg-transparent text-slate-300 focus:outline-none resize-none leading-relaxed"
              />
              <p className="text-xs text-slate-500 mt-2">Notes auto-save on blur</p>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
