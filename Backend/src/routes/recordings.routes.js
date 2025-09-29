const express = require('express');
const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const mongoose = require('mongoose');
const Recording = require('../models/Recording');
const AuthMiddleware = require('../middlewares/auth');

const router = express.Router();

// Multer storage in memory; we'll stream into GridFS
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 * 1024 } });

function getBucket() {
  const db = mongoose.connection.db;
  return new GridFSBucket(db, { bucketName: 'recordings' });
}

// Upload a recording
router.post('/', AuthMiddleware.authenticate, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video file provided' });
    }

    const { title, flightId, flightNumber, durationMs } = req.body;

    const bucket = getBucket();
    const filename = req.file.originalname || `recording_${Date.now()}.webm`;
    const contentType = req.file.mimetype || 'video/webm';

    const uploadStream = bucket.openUploadStream(filename, {
      contentType,
      metadata: {
        userId: req.userId?.toString(),
        flightId,
        flightNumber,
        durationMs: durationMs ? Number(durationMs) : undefined
      }
    });

    uploadStream.on('error', (err) => {
      console.error('GridFS upload error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Upload failed' });
      }
    });

    uploadStream.on('finish', async () => {
      try {
        const recording = await Recording.create({
          title: title || filename,
          userId: req.userId,
          flightId,
          flightNumber,
          mimeType: contentType,
          fileId: uploadStream.id,
          fileName: filename,
          fileSize: req.file.size,
          durationMs: durationMs ? Number(durationMs) : undefined,
          metadata: {
            userId: req.userId?.toString(),
            flightId,
            flightNumber
          }
        });

        res.status(201).json({ success: true, data: recording });
      } catch (e) {
        console.error('Recording save error:', e);
        res.status(500).json({ success: false, message: 'Failed to save recording metadata' });
      }
    });

    // Start writing buffer to GridFS
    uploadStream.end(req.file.buffer);
  } catch (error) {
    console.error('Upload handler error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// List recordings (optionally by current user)
// List recordings (current user by default; pass all=true for all records - for debugging)
router.get('/', AuthMiddleware.authenticate, async (req, res) => {
  try {
    const listAll = String(req.query.all || '').toLowerCase() === 'true';
    const userIdStr = String(req.userId || 'n/a');
    const tokenInQuery = typeof req.query.token === 'string';
    const hasAuthHeader = !!req.headers.authorization;
    const userCount = await Recording.countDocuments({ userId: req.userId });
    const totalCount = await Recording.countDocuments({});
    const filter = listAll ? {} : { userId: req.userId };
    const recordings = await Recording.find(filter).sort({ createdAt: -1 });
    console.log('[recordings] list user', userIdStr, 'all', listAll, 'tokenInQuery', tokenInQuery, 'hasAuthHeader', hasAuthHeader, 'userCount', userCount, 'totalCount', totalCount, 'returned', recordings.length);
    res.json({ success: true, data: recordings, meta: { userId: userIdStr, userCount, totalCount, all: listAll } });
  } catch (error) {
    console.error('List recordings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Debug: basic counts and latest items
router.get('/debug', AuthMiddleware.authenticate, async (req, res) => {
  try {
    const userCount = await Recording.countDocuments({ userId: req.userId });
    const totalCount = await Recording.countDocuments({});
    const latest = await Recording.find({}).sort({ createdAt: -1 }).limit(3).select('title userId createdAt');
    res.json({ success: true, data: { userId: String(req.userId), userCount, totalCount, latest } });
  } catch (error) {
    console.error('Debug recordings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Stream a recording by id
router.get('/:id/stream', AuthMiddleware.authenticate, async (req, res) => {
  try {
    const rec = await Recording.findById(req.params.id);
    if (!rec) return res.status(404).json({ success: false, message: 'Recording not found' });
    const allowAll = String(req.query.all || '').toLowerCase() === 'true';
    if (!allowAll && rec.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const bucket = getBucket();
    const files = await bucket.find({ _id: rec.fileId }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    const fileDoc = files[0];
    const fileSize = fileDoc.length;
    const contentType = rec.mimeType || fileDoc.contentType || 'video/webm';

    const range = req.headers.range;
    if (range) {
      // Parse Range: bytes=start-end
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const endInclusive = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      if (isNaN(start) || isNaN(endInclusive) || start > endInclusive || start >= fileSize) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }

      const chunkSize = endInclusive - start + 1;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${endInclusive}/${fileSize}`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', chunkSize);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${fileDoc.filename || 'recording.webm'}"`);
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

      const downloadStream = bucket.openDownloadStream(rec.fileId, { start, end: endInclusive + 1 });
      downloadStream.on('error', (err) => {
        console.error('Stream error:', err);
        if (!res.headersSent) res.status(500).end(); else res.end();
      });
      downloadStream.pipe(res);
    } else {
      // Full content
      res.status(200);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', fileSize);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Disposition', `inline; filename="${fileDoc.filename || 'recording.webm'}"`);
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      const downloadStream = bucket.openDownloadStream(rec.fileId);
      downloadStream.on('error', (err) => {
        console.error('Stream error:', err);
        if (!res.headersSent) res.status(500).end(); else res.end();
      });
      downloadStream.pipe(res);
    }
  } catch (error) {
    console.error('Stream handler error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete a recording by id
router.delete('/:id', AuthMiddleware.authenticate, async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id);
    
    if (!recording) {
      return res.status(404).json({ success: false, message: 'Recording not found' });
    }
    
    // Check if the user owns this recording
    if (recording.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not own this recording' });
    }
    
    // Delete the file from GridFS
    const bucket = getBucket();
    try {
      await bucket.delete(recording.fileId);
    } catch (deleteErr) {
      console.error('Error deleting file from GridFS:', deleteErr);
      // Continue with metadata deletion even if file deletion fails
    }
    
    // Delete the metadata from the database
    await Recording.findByIdAndDelete(req.params.id);
    
    res.json({ success: true, message: 'Recording deleted successfully' });
  } catch (error) {
    console.error('Delete recording error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;