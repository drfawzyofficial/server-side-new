const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const { authenticateUser } = require('../middleware/auth');

// Friend request routes
router.post('/send', authenticateUser, friendController.sendFriendRequest);
router.get('/pending', authenticateUser, friendController.getPendingRequests);
router.get('/sent', authenticateUser, friendController.getSentRequests);
router.post('/accept', authenticateUser, friendController.acceptFriendRequest);
router.post('/decline', authenticateUser, friendController.declineFriendRequest);
router.post('/cancel', authenticateUser, friendController.cancelFriendRequest);
router.get('/list', authenticateUser, friendController.getFriends);
router.post('/remove', authenticateUser, friendController.removeFriend);

module.exports = router;

