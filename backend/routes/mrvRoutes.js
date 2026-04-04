const express = require('express');
const axios = require('axios');
const router = express.Router();

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// POST /api/mrv/predict
router.post('/predict', async (req, res) => {
  try {
    const { polygon, points, startDate, endDate, projectId, use_fixed_csv } = req.body;

if (!startDate || !endDate) {
  return res.status(400).json({ success: false, error: 'startDate and endDate are required' });
}

const { data: job } = await axios.post(`${ML_URL}/predict`, {
  polygon_geojson: polygon || null,
  points: points || null,
  use_fixed_csv: use_fixed_csv || false,
  start_date: startDate,
  end_date: endDate,
  project_id: projectId || null,
});

    console.log('ML job started:', job.job_id);

    // 2. Poll every 5 seconds, max 10 minutes
    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const { data: s } = await axios.get(`${ML_URL}/predict/status/${job.job_id}`);
      console.log(`Job ${job.job_id} status: ${s.status} (poll ${i + 1})`);

      if (s.status === 'done')  return res.json({ success: true, job_id: job.job_id, result: s.result });
      if (s.status === 'error') return res.status(500).json({ success: false, error: s.result.error });
    }

    res.status(504).json({ success: false, error: 'ML prediction timed out after 10 minutes' });

  } catch (err) {
    console.error('MRV predict error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/mrv/status/:jobId
router.get('/status/:jobId', async (req, res) => {
  try {
    const { data } = await axios.get(`${ML_URL}/status/${req.params.jobId}`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mrv/health
router.get('/health', async (req, res) => {
  try {
    const { data } = await axios.get(`${ML_URL}/health`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'ML service unreachable', detail: err.message });
  }
});

module.exports = router;