const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const { uploadAudio, getAudioUrl, deleteAudioFile } = require('../config/audioStorage');
const Message = require('../models/Message');
const path = require('path');

// POST /api/upload-audio - Upload audio file (requires JWT)
router.post('/upload-audio', authenticateUser, (req, res) => {
  console.log('Audio upload request received:', {
    user: req.user.fullname,
    headers: req.headers,
    body: req.body
  });
  
  uploadAudio(req, res, async (err) => {
    if (err) {
      console.error('Audio upload error:', err);
      return res.status(400).json({
        success: false,
        error: 'Upload Error',
        message: err.message || 'Failed to upload audio file'
      });
    }

    console.log('Multer processing completed:', {
      file: req.file ? {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : 'No file',
      body: req.body
    });

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Upload Error',
        message: 'No audio file provided'
      });
    }

    try {
      // Create message with audio file
      const message = new Message({
        sender: req.userId,
        senderName: req.user.fullname,
        messageType: 'audio',
        audioFile: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          duration: req.body.duration ? parseFloat(req.body.duration) : null
        }
      });

      await message.save();

      // Emit to Socket.IO clients
      const io = req.app.get('io');
      if (io) {
        io.to('general').emit('receiveMessage', {
          id: message._id,
          sender: req.userId,
          senderName: req.user.fullname,
          messageType: 'audio',
          audioFile: {
            filename: message.audioFile.filename,
            originalName: message.audioFile.originalName,
            mimeType: message.audioFile.mimeType,
            size: message.audioFile.size,
            duration: message.audioFile.duration,
            url: getAudioUrl(message.audioFile.filename)
          },
          timestamp: message.timestamp
        });
      }

      res.status(201).json({
        success: true,
        data: {
          messageId: message._id,
          audioFile: {
            filename: message.audioFile.filename,
            originalName: message.audioFile.originalName,
            mimeType: message.audioFile.mimeType,
            size: message.audioFile.size,
            duration: message.audioFile.duration,
            url: getAudioUrl(message.audioFile.filename)
          }
        },
        message: 'Audio message sent successfully'
      });

    } catch (error) {
      console.error('Error creating audio message:', error);
      
      // Clean up uploaded file if message creation fails
      deleteAudioFile(req.file.filename);
      
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to create audio message'
      });
    }
  });
});

// GET /uploads/audio/:filename - Serve audio files
router.get('/uploads/audio/:filename', (req, res) => {
  const filename = req.params.filename;
  const audioPath = path.join(__dirname, '..', 'uploads', 'audio', filename);
  
  // Set appropriate headers for audio files
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Accept-Ranges', 'bytes');
  
  res.sendFile(audioPath, (err) => {
    if (err) {
      console.error('Error serving audio file:', err);
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Audio file not found'
      });
    }
  });
});

// DELETE /api/messages/:id - Delete message (requires JWT)
router.delete('/messages/:id', authenticateUser, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Message not found'
      });
    }

    // Check if user owns the message
    if (message.sender.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only delete your own messages'
      });
    }

    // Delete audio file if it exists
    if (message.messageType === 'audio' && message.audioFile.filename) {
      deleteAudioFile(message.audioFile.filename);
    }

    await Message.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete message'
    });
  }
});

module.exports = router;
