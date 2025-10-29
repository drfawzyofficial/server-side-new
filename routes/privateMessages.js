const express = require('express');
const router = express.Router();
const privateMessageController = require('../controllers/privateMessageController');
const { authenticateUser } = require('../middleware/auth');

// Private message routes
router.post('/send', authenticateUser, privateMessageController.sendPrivateMessage);
router.get('/conversations', authenticateUser, privateMessageController.getConversations);
router.get('/conversation/:otherUserId', authenticateUser, privateMessageController.getConversationMessages);

module.exports = router;

