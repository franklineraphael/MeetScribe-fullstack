import express from 'express';
import User from '../models/User.js';
import Meeting from '../models/Meeting.js';
import { protect } from '../middleware/auth.js';
import {
  getZoomAuthUrl,
  exchangeZoomCode,
  listUpcomingMeetings,
  startCloudRecording,
  stopCloudRecording,
  getRecordingDetails
} from '../utils/zoom.js';

const router = express.Router();

// ---------- STATUS ----------
router.get('/status', protect, async (req, res) => {
  const u = req.user;
  res.json({
    success: true,
    integrations: {
      zoom: {
        connected: u.integrations?.zoom?.connected || false,
        expiresAt: u.integrations?.zoom?.expiresAt || null
      },
      google: { connected: u.integrations?.google?.connected || false },
      teams: { connected: u.integrations?.teams?.connected || false }
    }
  });
});

// ---------- ZOOM OAUTH ----------

// Start OAuth — returns auth URL for frontend redirect
router.get('/zoom/auth', protect, async (req, res) => {
  try {
    const state = Buffer.from(JSON.stringify({ userId: req.user._id.toString() })).toString('base64url');
    const { authUrl, mock } = getZoomAuthUrl(state);
    res.json({
      success: true,
      authUrl,
      mock,
      message: mock
        ? 'Zoom credentials not set — use POST /integrations/zoom/connect-demo for instant connect'
        : 'Redirect user to authUrl'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// OAuth callback — exchange code for tokens
router.post('/zoom/callback', protect, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code && process.env.ZOOM_CLIENT_ID) {
      return res.status(400).json({ success: false, message: 'Authorization code required' });
    }

    const tokens = await exchangeZoomCode(code || 'mock_code');

    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        'integrations.zoom.connected': true,
        'integrations.zoom.accessToken': tokens.access_token,
        'integrations.zoom.refreshToken': tokens.refresh_token,
        'integrations.zoom.expiresAt': new Date(Date.now() + (tokens.expires_in || 3600) * 1000)
      }
    });

    res.json({
      success: true,
      message: 'Zoom connected successfully',
      expiresIn: tokens.expires_in
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Instant demo connect (no OAuth needed)
router.post('/zoom/connect-demo', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        'integrations.zoom.connected': true,
        'integrations.zoom.accessToken': `demo_zoom_${Date.now()}`,
        'integrations.zoom.refreshToken': `demo_refresh_${Date.now()}`,
        'integrations.zoom.expiresAt': new Date(Date.now() + 86400000 * 30)
      }
    });
    res.json({ success: true, message: 'Zoom connected (demo mode)' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Disconnect Zoom
router.delete('/zoom/disconnect', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        'integrations.zoom.connected': false,
        'integrations.zoom.accessToken': null,
        'integrations.zoom.refreshToken': null,
        'integrations.zoom.expiresAt': null
      }
    });
    res.json({ success: true, message: 'Zoom disconnected' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------- ZOOM MEETINGS & RECORDING ----------

// List upcoming Zoom meetings
router.get('/zoom/meetings', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.integrations?.zoom?.connected || !user.integrations.zoom.accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Zoom not connected. Connect Zoom first.'
      });
    }

    const meetings = await listUpcomingMeetings(user.integrations.zoom.accessToken);
    res.json({ success: true, count: meetings.length, meetings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Import a Zoom meeting into MeetScribe
router.post('/zoom/import', protect, async (req, res) => {
  try {
    const { zoomMeetingId, topic, joinUrl, startTime, duration } = req.body;
    if (!zoomMeetingId || !topic) {
      return res.status(400).json({ success: false, message: 'zoomMeetingId and topic required' });
    }

    const user = await User.findById(req.user._id);
    if (user.meetingsUsedThisMonth >= user.meetingsLimit && user.plan === 'free') {
      return res.status(403).json({
        success: false,
        message: 'Free plan limit reached. Upgrade to record more meetings.'
      });
    }

    const existing = await Meeting.findOne({
      user: req.user._id,
      externalId: zoomMeetingId,
      platform: 'zoom'
    });
    if (existing) {
      return res.json({ success: true, data: existing, message: 'Already imported' });
    }

    const meeting = await Meeting.create({
      user: req.user._id,
      title: topic,
      platform: 'zoom',
      meetingUrl: joinUrl,
      externalId: zoomMeetingId,
      status: 'scheduled',
      duration: (duration || 0) * 60,
      recordedAt: startTime ? new Date(startTime) : undefined
    });

    res.status(201).json({ success: true, data: meeting });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Start cloud recording on a Zoom meeting
router.post('/zoom/record/start', protect, async (req, res) => {
  try {
    const { zoomMeetingId, meetingId } = req.body; // meetingId = our DB id (optional)
    if (!zoomMeetingId) {
      return res.status(400).json({ success: false, message: 'zoomMeetingId required' });
    }

    const user = await User.findById(req.user._id);
    if (!user.integrations?.zoom?.connected) {
      return res.status(400).json({ success: false, message: 'Zoom not connected' });
    }

    // Pro feature check for cloud recording
    if (user.plan === 'free') {
      return res.status(403).json({
        success: false,
        message: 'Zoom cloud recording requires Starter or Pro plan'
      });
    }

    const result = await startCloudRecording(
      user.integrations.zoom.accessToken,
      zoomMeetingId
    );

    // Update or create local meeting record
    let meeting;
    if (meetingId) {
      meeting = await Meeting.findOneAndUpdate(
        { _id: meetingId, user: req.user._id },
        {
          status: 'recording',
          externalId: zoomMeetingId,
          platform: 'zoom',
          recordedAt: new Date()
        },
        { new: true }
      );
    } else {
      meeting = await Meeting.findOneAndUpdate(
        { user: req.user._id, externalId: zoomMeetingId },
        {
          status: 'recording',
          recordedAt: new Date()
        },
        { new: true }
      );
    }

    res.json({
      success: true,
      recording: result,
      meeting: meeting || null,
      message: 'Cloud recording started'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Stop cloud recording and trigger transcription
router.post('/zoom/record/stop', protect, async (req, res) => {
  try {
    const { zoomMeetingId, meetingId } = req.body;
    if (!zoomMeetingId) {
      return res.status(400).json({ success: false, message: 'zoomMeetingId required' });
    }

    const user = await User.findById(req.user._id);
    if (!user.integrations?.zoom?.connected) {
      return res.status(400).json({ success: false, message: 'Zoom not connected' });
    }

    const result = await stopCloudRecording(
      user.integrations.zoom.accessToken,
      zoomMeetingId
    );

    // Find local meeting
    let meeting = meetingId
      ? await Meeting.findOne({ _id: meetingId, user: req.user._id })
      : await Meeting.findOne({ user: req.user._id, externalId: zoomMeetingId });

    if (meeting) {
      meeting.status = 'processing';
      meeting.audioUrl = result.recordingFiles?.[0]?.download_url || null;
      if (result.recordingFiles?.[0]) {
        const start = new Date(result.recordingFiles[0].recording_start);
        const end = new Date(result.recordingFiles[0].recording_end);
        meeting.duration = Math.round((end - start) / 1000);
      }
      await meeting.save();

      // Simulate AI processing (same as manual meetings)
      setTimeout(async () => {
        try {
          const speakers = ['Alex', 'Jordan', 'Sam', 'Taylor'];
          const segments = [
            { speaker: speakers[0], text: `Welcome to ${meeting.title}. Let's dive in.`, start: 0, end: 10 },
            { speaker: speakers[1], text: "I've prepared the metrics — we're ahead of target this quarter.", start: 11, end: 25 },
            { speaker: speakers[2], text: "Great. Action item: finalize the Zoom integration docs by EOD.", start: 26, end: 40 },
            { speaker: speakers[0], text: "Agreed. Also, let's enable cloud recording by default for all Pro users.", start: 41, end: 55 }
          ];
          meeting.status = 'completed';
          meeting.transcript = {
            raw: segments.map((s) => `${s.speaker}: ${s.text}`).join('\n'),
            segments
          };
          meeting.summary = {
            overview: `Zoom recording of "${meeting.title}" processed successfully. Team discussed metrics and integration priorities.`,
            keyPoints: [
              'Quarterly metrics ahead of target',
              'Zoom cloud recording to be enabled for Pro',
              'Integration docs due EOD'
            ],
            actionItems: [
              {
                text: 'Finalize Zoom integration documentation',
                assignee: 'Sam',
                dueDate: new Date(Date.now() + 86400000),
                completed: false
              },
              {
                text: 'Enable default cloud recording for Pro plan',
                assignee: 'Alex',
                dueDate: new Date(Date.now() + 2 * 86400000),
                completed: false
              }
            ],
            decisions: ['Cloud recording enabled by default for Pro users'],
            participants: speakers
          };
          meeting.processedAt = new Date();
          await meeting.save();
          await User.findByIdAndUpdate(req.user._id, { $inc: { meetingsUsedThisMonth: 1 } });
        } catch (e) {
          console.error('Post-recording AI error', e);
        }
      }, 3000);
    }

    res.json({
      success: true,
      recording: result,
      meeting,
      message: 'Recording stopped. Transcription started.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get recording files for a Zoom meeting
router.get('/zoom/recordings/:zoomMeetingId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.integrations?.zoom?.connected) {
      return res.status(400).json({ success: false, message: 'Zoom not connected' });
    }

    const details = await getRecordingDetails(
      user.integrations.zoom.accessToken,
      req.params.zoomMeetingId
    );
    res.json({ success: true, data: details });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------- GENERIC CONNECT (Google / Teams still mock) ----------
router.post('/connect/:platform', protect, async (req, res) => {
  const platform = req.params.platform;
  if (platform === 'zoom') {
    return res.status(400).json({
      success: false,
      message: 'Use /integrations/zoom/connect-demo or /integrations/zoom/auth for Zoom'
    });
  }
  if (!['google', 'teams'].includes(platform)) {
    return res.status(400).json({ success: false, message: 'Unsupported platform' });
  }

  const update = {};
  update[`integrations.${platform}.connected`] = true;
  update[`integrations.${platform}.accessToken`] = `mock_${platform}_token_${Date.now()}`;
  update[`integrations.${platform}.expiresAt`] = new Date(Date.now() + 3600 * 1000);

  await User.findByIdAndUpdate(req.user._id, { $set: update });
  res.json({ success: true, message: `${platform} connected successfully` });
});

router.delete('/disconnect/:platform', protect, async (req, res) => {
  const platform = req.params.platform;
  if (platform === 'zoom') {
    // redirect to dedicated endpoint logic
    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        'integrations.zoom.connected': false,
        'integrations.zoom.accessToken': null,
        'integrations.zoom.refreshToken': null
      }
    });
    return res.json({ success: true, message: 'Zoom disconnected' });
  }
  if (!['google', 'teams'].includes(platform)) {
    return res.status(400).json({ success: false, message: 'Unsupported platform' });
  }
  const update = {};
  update[`integrations.${platform}.connected`] = false;
  update[`integrations.${platform}.accessToken`] = null;
  await User.findByIdAndUpdate(req.user._id, { $set: update });
  res.json({ success: true, message: `${platform} disconnected` });
});

export default router;
