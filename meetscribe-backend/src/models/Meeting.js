import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  platform: { type: String, enum: ['zoom', 'google', 'teams', 'manual', 'other'], default: 'manual' },
  meetingUrl: String,
  externalId: String, // Zoom/Google meeting ID
  status: { type: String, enum: ['scheduled', 'recording', 'processing', 'completed', 'failed'], default: 'scheduled' },
  duration: { type: Number, default: 0 }, // seconds
  audioUrl: String,
  transcript: {
    raw: String,
    segments: [{
      speaker: String,
      text: String,
      start: Number,
      end: Number
    }]
  },
  summary: {
    overview: String,
    keyPoints: [String],
    actionItems: [{
      text: String,
      assignee: String,
      dueDate: Date,
      completed: { type: Boolean, default: false }
    }],
    decisions: [String],
    participants: [String]
  },
  notes: String,
  tags: [String],
  recordedAt: Date,
  processedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Meeting', meetingSchema);
