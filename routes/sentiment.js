const express = require('express');
const router = express.Router();
const sentimentController = require('../controllers/sentimentController');
const { authenticateUser } = require('../middleware/auth');

// Sentiment analysis routes (require authentication)
router.post('/analyze', authenticateUser, sentimentController.analyzeSentiment);
router.post('/analyze-batch', authenticateUser, sentimentController.analyzeBatchSentiment);

module.exports = router;
