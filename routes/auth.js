const express = require('express');
const router = express.Router();
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

// File serving routes
router.get('/uploads/avatars/:filename', authenticateUser, authController.serveAvatar);

module.exports = router;
