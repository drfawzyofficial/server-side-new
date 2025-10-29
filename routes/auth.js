const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const authController = require('../controllers/authController');
const { authenticateUser } = require('../middleware/auth');
const { uploadAvatar } = require('../config/avatarStorage');

// Authentication routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authenticateUser, authController.logout);
router.get('/me', authenticateUser, authController.getCurrentUser);
router.put('/profile', authenticateUser, authController.updateProfile);
router.put('/change-password', authenticateUser, authController.changePassword);
router.post('/avatar', authenticateUser, uploadAvatar, authController.uploadAvatar);
router.delete('/account', authenticateUser, authController.deleteAccount);

// Email verification routes
router.post('/send-email-verification', authenticateUser, authController.sendEmailVerification);
router.post('/verify-email', authenticateUser, authController.verifyEmail);

// Password reset routes
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-code', authController.verifyResetCode);
router.post('/reset-password', authController.resetPassword);

// User management routes
router.get('/users', authenticateUser, authController.getUsers);

// Securely serve avatar files (auth required)
router.get('/uploads/avatars/:filename', authenticateUser, (req, res) => {
  const { filename } = req.params;

  // Whitelist filename characters to prevent traversal
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    return res.status(400).json({ success: false, error: 'Bad Request', message: 'Invalid filename' });
  }

  // Enforce image extensions only
  if (!/\.(png|jpe?g|gif|webp)$/i.test(filename)) {
    return res.status(400).json({ success: false, error: 'Bad Request', message: 'Unsupported file type' });
  }

  const AVATAR_DIR = path.resolve(__dirname, '..', 'uploads', 'avatars');
  const finalPath = path.resolve(AVATAR_DIR, filename);

  // Ensure the resolved path stays within the avatars directory
  if (!finalPath.startsWith(AVATAR_DIR + path.sep)) {
    return res.status(400).json({ success: false, error: 'Bad Request', message: 'Invalid path' });
  }

  if (!fs.existsSync(finalPath)) {
    return res.status(404).json({ success: false, error: 'Not Found', message: 'Avatar file not found' });
  }

  res.set('Cache-Control', 'private, max-age=86400'); // 1 day, private since it’s behind auth
  res.type(path.extname(finalPath));
  res.sendFile(finalPath, (err) => {
    if (err) {
      console.error('Error serving avatar file:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to serve avatar' });
      }
    }
  });
});

module.exports = router;
