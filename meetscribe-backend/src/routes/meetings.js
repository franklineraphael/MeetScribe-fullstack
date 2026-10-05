import express from 'express';
import Meeting from '../models/Meeting.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const generateMockAI = (title) => {
  const speakers = ['Alex', 'Jordan', 'Sam', 'Taylor'];
  const segments = [
    { speaker: speakers[0], text: `Welcome everyone to today's meeting about ${title}. Let's start with the agenda.`, start: 0, end: 12 },
    { speaker: speakers[1], text: "Thanks. I reviewed the Q3 numbers and we're tracking 18% above target.", start: 13, end: 28 },
    { speaker: speakers[2], text: "Great progress. We should prioritize the mobile redesign for next sprint.", start: 29, end: 42 },
    { speaker: speakers[0], text: "Agreed. Action item: Sam will prepare the wireframes by Friday.", start: 43, end: 55 },
    { speaker: speakers[3], text: "I'll coordinate with design. Also, we need to decide on the pricing experiment.", start: 56, end: 70 },
    { speaker: speakers[1], text: "Let's go with the $4.99 and $9.99 tiers we discussed. I'll update the landing page.", start: 71, end: 88 }
  ];
  return {
    transcript: {
      raw: segments.map(s => `${s.speaker}: ${s.text}`).join('\n'),
      segments
    },
    summary: {
      overview: `Productive discussion on ${title}. Team reviewed performance metrics and aligned on next priorities including mobile redesign and pricing strategy.`,
      keyPoints: [
        "Q3 performance 18% above target",
        "Mobile redesign prioritized for next sprint",
        "Pricing tiers confirmed at $4.99 / $9.99",
        "Wireframes due Friday"
      ],
      actionItems: [
        { text: "Prepare mobile redesign wireframes", assignee: "Sam", dueDate: new Date(Date.now() + 5 * 86400000), completed: false },
        { text: "Update landing page with new pricing", assignee: "Jordan", dueDate: new Date(Date.now() + 3 * 86400000), completed: false }
      ],
      decisions: [
        "Proceed with $4.99 Starter and $9.99 Pro pricing",
        "Mobile redesign takes priority next sprint"
      ],
      participants: speakers
    }
  };
};

router.get('/', protect, async (req, res) => {
  try {
    const meetings = await Meeting.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, count: meetings.length, data: meetings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, user: req.user._id });
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    res.json({ success: true, data: meeting });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.meetingsUsedThisMonth >= user.meetingsLimit && user.plan === 'free') {
      return res.status(403).json({
        success: false,
        message: 'Free plan limit reached. Upgrade to Starter or Pro for more meetings.',
        limit: user.meetingsLimit
      });
    }

    const { title, platform, meetingUrl } = req.body;
    const meeting = await Meeting.create({
      user: req.user._id,
      title: title || 'Untitled Meeting',
      platform: platform || 'manual',
      meetingUrl,
      status: 'recording',
      recordedAt: new Date()
    });

    setTimeout(async () => {
      try {
        const ai = generateMockAI(meeting.title);
        meeting.status = 'completed';
        meeting.duration = 95;
        meeting.transcript = ai.transcript;
        meeting.summary = ai.summary;
        meeting.processedAt = new Date();
        await meeting.save();
        await User.findByIdAndUpdate(req.user._id, { $inc: { meetingsUsedThisMonth: 1 } });
      } catch (e) {
        console.error('AI process error', e);
      }
    }, 2500);

    res.status(201).json({ success: true, data: meeting });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    let meeting = await Meeting.findOne({ _id: req.params.id, user: req.user._id });
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });

    const { title, notes, tags, summary } = req.body;
    if (title) meeting.title = title;
    if (notes !== undefined) meeting.notes = notes;
    if (tags) meeting.tags = tags;
    if (summary) meeting.summary = { ...meeting.summary.toObject?.() || meeting.summary, ...summary };

    await meeting.save();
    res.json({ success: true, data: meeting });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const meeting = await Meeting.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    res.json({ success: true, message: 'Meeting deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:id/process', protect, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, user: req.user._id });
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });

    meeting.status = 'processing';
    await meeting.save();

    const ai = generateMockAI(meeting.title);
    meeting.status = 'completed';
    meeting.duration = meeting.duration || 120;
    meeting.transcript = ai.transcript;
    meeting.summary = ai.summary;
    meeting.processedAt = new Date();
    await meeting.save();

    res.json({ success: true, data: meeting });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
