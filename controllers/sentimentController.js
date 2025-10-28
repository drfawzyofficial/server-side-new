const axios = require('axios');

// Sentiment analysis controller
const analyzeSentiment = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Text is required for sentiment analysis'
      });
    }
    
    console.log(`📝 Analyzing sentiment for text: "${text}"`);
    
    // Forward request to Flask AI server
    const flaskServerUrl = process.env.FLASK_SERVER_URL || 'http://localhost:5001';
    
    try {
      const response = await axios.post(`${flaskServerUrl}/predict`, {
        text: text.trim()
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = response.data;
      
      console.log(`📊 Analysis complete: ${result.sentiment} (confidence: ${result.confidence})`);
      
      res.json({
        success: true,
        message: 'Sentiment analysis completed successfully',
        data: {
          text: text.trim(),
          sentiment: result.sentiment,
          confidence: result.confidence,
          analysis: result.analysis || null,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (flaskError) {
      console.error('Flask server error:', flaskError.message);
      
      // If Flask server is not available, provide fallback analysis
      const fallbackResult = performFallbackAnalysis(text.trim());
      
      res.json({
        success: true,
        message: 'Sentiment analysis completed (fallback mode)',
        data: {
          text: text.trim(),
          sentiment: fallbackResult.sentiment,
          confidence: fallbackResult.confidence,
          analysis: fallbackResult.analysis,
          timestamp: new Date().toISOString(),
          note: 'Using fallback analysis - AI server unavailable'
        }
      });
    }
    
  } catch (error) {
    console.error('Error in sentiment analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to analyze sentiment'
    });
  }
};

const analyzeBatchSentiment = async (req, res) => {
  try {
    const { texts } = req.body;
    
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Texts array is required for batch sentiment analysis'
      });
    }
    
    if (texts.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Maximum 10 texts allowed for batch analysis'
      });
    }
    
    console.log(`📝 Analyzing batch sentiment for ${texts.length} texts`);
    
    // Forward request to Flask AI server
    const flaskServerUrl = process.env.FLASK_SERVER_URL || 'http://localhost:5001';
    
    try {
      const response = await axios.post(`${flaskServerUrl}/predict-batch`, {
        texts: texts.map(text => text.trim()).filter(text => text.length > 0)
      }, {
        timeout: 30000, // Longer timeout for batch processing
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const results = response.data;
      
      console.log(`📊 Batch analysis complete: ${results.results.length} texts analyzed`);
      
      res.json({
        success: true,
        message: 'Batch sentiment analysis completed successfully',
        data: {
          results: results.results,
          totalProcessed: results.results.length,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (flaskError) {
      console.error('Flask server error:', flaskError.message);
      
      // If Flask server is not available, provide fallback analysis
      const fallbackResults = texts.map(text => performFallbackAnalysis(text.trim()));
      
      res.json({
        success: true,
        message: 'Batch sentiment analysis completed (fallback mode)',
        data: {
          results: fallbackResults,
          totalProcessed: fallbackResults.length,
          timestamp: new Date().toISOString(),
          note: 'Using fallback analysis - AI server unavailable'
        }
      });
    }
    
  } catch (error) {
    console.error('Error in batch sentiment analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to analyze batch sentiment'
    });
  }
};

// Fallback sentiment analysis function
const performFallbackAnalysis = (text) => {
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'joy', 'pleased', 'satisfied', 'perfect', 'awesome', 'brilliant', 'outstanding', 'superb', 'marvelous', 'delighted', 'thrilled'];
  const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'angry', 'sad', 'disappointed', 'frustrated', 'annoyed', 'upset', 'worried', 'concerned', 'disgusted', 'furious', 'miserable', 'depressed', 'frustrated', 'annoying'];
  
  const words = text.toLowerCase().split(/\s+/);
  let positiveScore = 0;
  let negativeScore = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) positiveScore++;
    if (negativeWords.includes(word)) negativeScore++;
  });
  
  let sentiment = 'neutral';
  let confidence = 0.5;
  
  if (positiveScore > negativeScore) {
    sentiment = 'positive';
    confidence = Math.min(0.9, 0.5 + (positiveScore - negativeScore) * 0.1);
  } else if (negativeScore > positiveScore) {
    sentiment = 'negative';
    confidence = Math.min(0.9, 0.5 + (negativeScore - positiveScore) * 0.1);
  }
  
  return {
    sentiment,
    confidence,
    analysis: {
      positiveWords: positiveScore,
      negativeWords: negativeScore,
      method: 'fallback'
    }
  };
};

module.exports = {
  analyzeSentiment,
  analyzeBatchSentiment
};
