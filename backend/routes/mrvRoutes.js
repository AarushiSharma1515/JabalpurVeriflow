const express = require('express');
const router = express.Router();
const axios = require('axios');
const mongoose = require('mongoose');
const MLResult = require('../models/MLResults');
const Project = require('../models/Project');

// Middleware to verify token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  
  // For now, just pass through since your auth is handled elsewhere
  // In production, verify the token properly
  req.user = { id: token };
  next();
};

// MRV Predict endpoint - matches your frontend call
router.post('/predict', authenticateToken, async (req, res) => {
  try {
    const { points, startDate, endDate, projectId } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ success: false, error: 'projectId is required' });
    }
    
    // Call your ML service on port 8000
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://192.168.168.61:8000';
    
    let mlResponse;
    try {
      mlResponse = await axios.post(`${mlServiceUrl}/predict`, {
      points,
      start_date: startDate,
      end_date: endDate,
      project_id: projectId
      }, {
        timeout: 300000,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (mlError) {
  console.error('ML service error:', mlError.message);
  return res.status(503).json({
    success: false,
    error: 'ML service unavailable. Please ensure the ML model is running.'
  });
}
    
    // Return job_id immediately for polling
    res.json({
      success: true,
      job_id: mlResponse.data.job_id
    });
    
  } catch (error) {
    console.error('MRV predict error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'ML analysis failed'
    });
  }
});

// Get ML status from the ML service
router.get('/predict/status/:jobId', authenticateToken, async (req, res) => {
  try {
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://192.168.168.61:8000';
    const statusResponse = await axios.get(`${mlServiceUrl}/predict/status/${req.params.jobId}`, {
      timeout: 600000,
    });
    res.json(statusResponse.data);
  } catch (error) {
    console.error('ML status proxy error:', error.message);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get ML job result by projectId
router.get('/job-result/:projectId', authenticateToken, async (req, res) => {
  try {
    // CHANGED: Accept 'after' query param to filter stale results
    const projectId = req.params.projectId;
    const afterTimestamp = req.query.after ? new Date(req.query.after) : null;

    const mlResult = await MLResult.findOne({ projectId })
      .sort({ createdAt: -1 });
    
    if (mlResult) {
      // CHANGED: Only return 'done' if result was created after job start time
      if (afterTimestamp && mlResult.createdAt < afterTimestamp) {
        return res.json({ success: true, status: 'running' });
      }
      
      return res.json({
        success: true,
        status: 'done',
        result: {
          mean_pred_agb_Mg_per_ha: mlResult.meanAgbMgPerHa,
          mean_pred_height_m: mlResult.meanHeightM,
          mean_pred_confidence: mlResult.modelR2Mean,
          mean_pred_carbon_Mg_per_ha: mlResult.carbonMgPerHa,
          mean_pred_co2_t_per_ha: mlResult.co2TPerHa,
          tier: mlResult.tier,
          tierLabel: mlResult.tierLabel,
          status: mlResult.status,
          credits: mlResult.credits
        }
      });
    }

    res.json({
      success: true,
      status: 'running'
    });
  } catch (error) {
    console.error('ML job result error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;