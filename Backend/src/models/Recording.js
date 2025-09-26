const mongoose = require('mongoose');

const RecordingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    flightId: { type: String },
    flightNumber: { type: String },
    mimeType: { type: String, default: 'video/webm' },
    fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
    fileName: { type: String },
    fileSize: { type: Number },
    durationMs: { type: Number },
    metadata: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Recording', RecordingSchema);


