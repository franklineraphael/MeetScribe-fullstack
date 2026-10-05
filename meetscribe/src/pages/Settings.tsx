import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2, Check, Loader2, Video, Mic, Square, Download, Import, RefreshCw
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { useSearchParams } from 'react-router-dom';

interface ZoomMeeting {
  id: string;
  topic: string;
  start_time: string;
  duration: number;
  join_url: string;
  status: string;
}

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [zoomMeetings, setZoomMeetings] = useState<ZoomMeeting[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (user?.integrations) {
      setStatus({
        zoom: !!user.integrations.zoom,
        google: !!user.integrations.google,
        teams: !!user.integrations.teams
      });
    }
  }, [user]);

  // Handle OAuth callback query
  useEffect(() => {
    if (searchParams.get('zoom') === 'callback') {
      const code = searchParams.get('code');
      if (code) {
        handleZoomCallback(code);
      }
    }
  }, [searchParams]);

  const handleZoomCallback = async (code: string) => {
    setLoading('zoom');
    try {
      await api.post('/integrations/zoom/callback', { code });
      await refreshUser();
      setStatus((s) => ({ ...s, zoom: true }));
      setMsg('Zoom connected via OAuth');
    } catch (err: any) {
      setMsg(err.response?.data?.message || 'OAuth callback failed');
    } finally {
      setLoading(null);
    }
  };

  const connectZoom = async () => {
    setLoading('zoom');
    setMsg('');
    try {
      // Try real OAuth URL first
      const { data } = await api.get('/integrations/zoom/auth');
      if (data.mock) {
        // No credentials — demo connect
        await api.post('/integrations/zoom/connect-demo');
        await refreshUser();
        setStatus((s) => ({ ...s, zoom: true }));
        setMsg('Zoom connected (demo mode)');
      } else {
        window.location.href = data.authUrl;
        return;
      }
    } catch (err: any) {
      // Fallback demo
      try {
        await api.post('/integrations/zoom/connect-demo');
        await refreshUser();
        setStatus((s) => ({ ...s, zoom: true }));
        setMsg('Zoom connected (demo mode)');
      } catch (e: any) {
        setMsg(e.response?.data?.message || 'Connect failed');
      }
    } finally {
      setLoading(null);
    }
  };

  const disconnectZoom = async () => {
    setLoading('zoom');
    try {
      await api.delete('/integrations/zoom/disconnect');
      await refreshUser();
      setStatus((s) => ({ ...s, zoom: false }));
      setZoomMeetings([]);
      setMsg('Zoom disconnected');
    } catch (err: any) {
      setMsg(err.response?.data?.message || 'Disconnect failed');
    } finally {
      setLoading(null);
    }
  };

  const toggleGeneric = async (platform: string, connect: boolean) => {
    setLoading(platform);
    try {
      if (connect) {
        await api.post(`/integrations/connect/${platform}`);
      } else {
        await api.delete(`/integrations/disconnect/${platform}`);
      }
      await refreshUser();
      setStatus((s) => ({ ...s, [platform]: connect }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  const fetchZoomMeetings = async () => {
    setLoadingMeetings(true);
    setMsg('');
    try {
      const { data } = await api.get('/integrations/zoom/meetings');
      setZoomMeetings(data.meetings || []);
    } catch (err: any) {
      setMsg(err.response?.data?.message || 'Failed to load Zoom meetings');
    } finally {
      setLoadingMeetings(false);
    }
  };

  const importMeeting = async (zm: ZoomMeeting) => {
    setLoading(`import-${zm.id}`);
    try {
      await api.post('/integrations/zoom/import', {
        zoomMeetingId: zm.id,
        topic: zm.topic,
        joinUrl: zm.join_url,
        startTime: zm.start_time,
        duration: zm.duration
      });
      setMsg(`Imported "${zm.topic}"`);
    } catch (err: any) {
      setMsg(err.response?.data?.message || 'Import failed');
    } finally {
      setLoading(null);
    }
  };

  const startRecording = async (zoomMeetingId: string) => {
    setLoading(`rec-${zoomMeetingId}`);
    setMsg('');
    try {
      const { data } = await api.post('/integrations/zoom/record/start', { zoomMeetingId });
      setRecordingId(zoomMeetingId);
      setMsg(data.message || 'Recording started');
    } catch (err: any) {
      setMsg(err.response?.data?.message || 'Could not start recording');
    } finally {
      setLoading(null);
    }
  };

  const stopRecording = async (zoomMeetingId: string) => {
    setLoading(`stop-${zoomMeetingId}`);
    try {
      const { data } = await api.post('/integrations/zoom/record/stop', { zoomMeetingId });
      setRecordingId(null);
      setMsg(data.message || 'Recording stopped — transcription started');
    } catch (err: any) {
      setMsg(err.response?.data?.message || 'Could not stop recording');
    } finally {
      setLoading(null);
    }
  };

  const platforms = [
    { id: 'google', name: 'Google Meet', color: 'from-green-500 to-emerald-600', desc: 'Sync calendar & capture Meet calls' },
    { id: 'teams', name: 'Microsoft Teams', color: 'from-purple-500 to-indigo-600', desc: 'Connect Teams for enterprise meetings' }
  ];

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="font-display text-3xl font-bold mb-2">Settings</h1>
      <p className="text-slate-400 mb-8">Manage integrations, Zoom recording & account</p>

      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 p-3 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-sm"
          >
            {msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ZOOM SECTION */}
      <section className="mb-12">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Video className="w-5 h-5 text-blue-400" />
          Zoom
        </h2>

        <div className="glass rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm">
              Z
            </div>
            <div className="flex-1">
              <p className="font-medium">Zoom</p>
              <p className="text-sm text-slate-400">
                OAuth connect · list meetings · cloud recording · auto-transcribe
              </p>
            </div>
            {status.zoom ? (
              <button
                onClick={disconnectZoom}
                disabled={loading === 'zoom'}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 text-green-400 text-sm font-medium hover:bg-green-500/20 transition"
              >
                {loading === 'zoom' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Connected
              </button>
            ) : (
              <button
                onClick={connectZoom}
                disabled={loading === 'zoom'}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium transition flex items-center gap-2"
              >
                {loading === 'zoom' && <Loader2 className="w-4 h-4 animate-spin" />}
                Connect Zoom
              </button>
            )}
          </div>
        </div>

        {/* Zoom meetings + recording controls */}
        {status.zoom && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="glass rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Upcoming Zoom meetings</h3>
              <button
                onClick={fetchZoomMeetings}
                disabled={loadingMeetings}
                className="flex items-center gap-1.5 text-xs text-neon-cyan hover:underline"
              >
                {loadingMeetings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Refresh
              </button>
            </div>

            {zoomMeetings.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">
                Click Refresh to load meetings from Zoom
              </p>
            ) : (
              <div className="space-y-3">
                {zoomMeetings.map((zm) => (
                  <div
                    key={zm.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-white/5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{zm.topic}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(zm.start_time).toLocaleString()} · {zm.duration} min
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => importMeeting(zm)}
                        disabled={loading === `import-${zm.id}`}
                        className="px-3 py-1.5 rounded-lg text-xs glass hover:bg-white/10 flex items-center gap-1"
                      >
                        {loading === `import-${zm.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Import className="w-3 h-3" />}
                        Import
                      </button>
                      {recordingId === zm.id ? (
                        <button
                          onClick={() => stopRecording(zm.id)}
                          disabled={loading === `stop-${zm.id}`}
                          className="px-3 py-1.5 rounded-lg text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center gap-1"
                        >
                          {loading === `stop-${zm.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3" />}
                          Stop recording
                        </button>
                      ) : (
                        <button
                          onClick={() => startRecording(zm.id)}
                          disabled={loading === `rec-${zm.id}` || !!recordingId}
                          className="px-3 py-1.5 rounded-lg text-xs bg-red-600/80 hover:bg-red-500 text-white flex items-center gap-1 disabled:opacity-40"
                        >
                          {loading === `rec-${zm.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mic className="w-3 h-3" />}
                          Record
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-slate-500">
              Cloud recording requires Starter or Pro. After stopping, the recording is transcribed and summarized automatically.
            </p>
          </motion.div>
        )}
      </section>

      {/* Other platforms */}
      <section className="mb-12">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Link2 className="w-5 h-5 text-neon-cyan" />
          Other platforms
        </h2>
        <div className="space-y-4">
          {platforms.map((p) => (
            <div key={p.id} className="glass rounded-2xl p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white font-bold text-sm`}>
                {p.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-slate-400">{p.desc}</p>
              </div>
              {status[p.id] ? (
                <button
                  onClick={() => toggleGeneric(p.id, false)}
                  disabled={loading === p.id}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 text-green-400 text-sm font-medium"
                >
                  {loading === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Connected
                </button>
              ) : (
                <button
                  onClick={() => toggleGeneric(p.id, true)}
                  disabled={loading === p.id}
                  className="px-4 py-2 rounded-xl glass hover:bg-white/10 text-sm font-medium"
                >
                  {loading === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect'}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Account */}
      <section>
        <h2 className="font-semibold text-lg mb-4">Account</h2>
        <div className="glass rounded-2xl p-5 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Name</span>
            <span>{user?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Email</span>
            <span>{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Plan</span>
            <span className="capitalize text-neon-cyan">{user?.plan}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Meetings used</span>
            <span>
              {user?.meetingsUsedThisMonth} / {user?.meetingsLimit}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
