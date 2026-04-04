# ML Model Integration Guide - Veriflow App

## Overview

This guide explains how to set up and use the ML model integration for carbon sequestration analysis in the Veriflow app. The integration connects your mobile app with the ML API server (based on your `api_server.py`) to analyze drone images, satellite data, and calculate CO2 equivalent values.

---

## What Was Integrated

### New Files Created:
1. **`screen/VerificationScreen.jsx`** - Main verification screen with ML analysis functionality
2. **`ML_INTEGRATION_GUIDE.md`** - This guide

### Modified Files:
1. **`services/projectsService.js`** - Added ML API integration functions
2. **`services/carbonService.js`** - Alternative ML service (for future use)
3. **`screen/AdminDashboard.jsx`** - Added "ML Verification" navigation button
4. **`screen/RecordFieldDataScreen.jsx`** - Added "Verify with ML" button
5. **`App.js`** - Added Verification screen to navigation
6. **`backend/models/Project.js`** - Added ML analysis fields to schema
7. **`backend/controllers/projectController.js`** - Added ML results handling
8. **`update-ml-api-url.sh`** - Script to easily update Ngrok URL

---

## Architecture

```
┌─────────────────┐
│  Mobile App     │
│  (React Native) │
└────────┬────────┘
         │
         │ 1. User selects project
         │ 2. Uploads drone image
         │
         v
┌─────────────────┐      ┌──────────────────┐
│ VerificationScn │ ---> │  ML API Server   │
│                 │      │  (api_server.py) │
└────────┬────────┘      └────────┬─────────┘
         │                        │
         │ 3. Results returned    │
         v                        v
┌─────────────────┐      ┌──────────────────┐
│  Backend API    │      │  ML Processing:  │
│  (Node.js)      │      │  1. Drone Analysis│
│                 │      │  2. Satellite Data│
│  Saves results  │      │  3. Integration  │
└─────────────────┘      └──────────────────┘
```

---

## Setup Instructions

### Step 1: Configure ML API Server

1. Navigate to your ML scripts directory where `api_server.py` is located:
   ```bash
   cd /path/to/your/ml/scripts  # Where api_server.py is located
   ```

2. Ensure you have all required files:
   - `api_server.py` (FastAPI server)
   - `3mix.py` (Satellite analysis script)
   - `randomforest2.py` (Drone analysis script)
   - `integration.py` (Integration script)
   - `points.csv` (Satellite data points)
   - Model files:
     - `mangrove_model.pkl` (Drone model)
     - `model_bundle_two_stage.joblib` (Satellite model)

3. Update the paths in `api_server.py` (lines 35-49):
   ```python
   BASE_DIR = Path(r"YOUR_PATH_HERE")  # Update this!
   DRONE_SCRIPT = BASE_DIR / "UAV" / "randomforest2.py"
   SATELLITE_SCRIPT = BASE_DIR / "3mix.py"
   INTEGRATION_SCRIPT = BASE_DIR / "UAV" / "integration.py"
   # ... etc
   ```

4. Install Python dependencies:
   ```bash
   pip install fastapi uvicorn python-multipart
   ```

5. Start the ML API server:
   ```bash
   python api_server.py
   # Or: uvicorn api_server:app --host 0.0.0.0 --port 8000
   ```

6. In a **separate terminal**, start Ngrok to expose your API:
   ```bash
   ngrok http 8000
   ```

7. Copy the HTTPS URL from Ngrok (e.g., `https://abc123.ngrok-free.app`)

### Step 2: Configure Mobile App

1. **Option A: Use the automated script (Recommended)**
   ```bash
   cd veriflow_app
   chmod +x update-ml-api-url.sh
   ./update-ml-api-url.sh https://your-ngrok-url.ngrok-free.app
   ```
   This will automatically update both `projectsService.js` and `carbonService.js`

2. **Option B: Manual update**
   Update the Ngrok URL in `veriflow_app/services/projectsService.js`:
   ```javascript
   // Line 144
   const ML_API_BASE = "https://YOUR_NGROK_URL.ngrok-free.app";
   ```
   And in `veriflow_app/services/carbonService.js`:
   ```javascript
   // Line 6
   const BASE_URL = "https://YOUR_NGROK_URL.ngrok-free.app";
   ```

3. Install app dependencies (if not already installed):
   ```bash
   cd veriflow_app
   npm install expo-image-picker
   ```

### Step 3: Start Backend Server

1. Navigate to backend directory:
   ```bash
   cd ../backend
   ```

2. Start the Node.js backend:
   ```bash
   npm start
   # Should run on http://10.1.30.65:5001 (or your configured IP)
   ```

### Step 4: Start Mobile App

1. Navigate to app directory:
   ```bash
   cd ../veriflow_app
   ```

2. Start the app:
   ```bash
   npm start
   # Or: expo start
   ```

---

## How to Use

### Complete Workflow:

1. **Login as Admin**
   - Use your admin credentials to log in

2. **Navigate to Verification**
   - From Admin Dashboard → Click "ML Verification" card
   - Or from Admin Dashboard → "Record Field Data" → "Verify with ML" button

3. **Select Project**
   - The Verification screen shows projects pending ML verification
   - These are projects that have field verification but no ML analysis yet
   - Click "Run ML Analysis" on a project

4. **Setup ML Analysis**
   - Click "Select Drone Image" to upload a drone image
   - Enter manual tree height (default: 6.23 meters)
   - Click "Run Analysis"

5. **Wait for Processing**
   - ML analysis takes 2-5 minutes
   - The system:
     - Analyzes drone image using `randomforest2.py`
     - Fetches satellite data using `3mix.py`
     - Integrates results using `integration.py`

6. **Review Results**
   - View carbon sequestration (kg)
   - View biomass (AGB Mg/ha)
   - View satellite vs drone analysis breakdown
   - See confidence scores

7. **Approve or Reject**
   - Add verification notes
   - Click "Approve" to verify the project
   - Or click "Reject" if issues found

8. **View in Manage Plots**
   - Go to Admin Dashboard → "Manage Plots"
   - Verified projects show ML results
   - Click "ML Results" to see detailed analysis

---

## API Endpoints

### ML API Server (`api_server.py`)

```
POST /api/analyze
```

**Request:**
- `image` (file): Drone image (JPEG/PNG)
- `start_date` (string): Satellite data start date (YYYY-MM-DD)
- `end_date` (string): Satellite data end date (YYYY-MM-DD)
- `manual_height` (float): Manual tree height in meters

**Response:**
```json
{
  "status": "success",
  "job_id": "abc123",
  "processing_time_seconds": 145.2,
  "final_results": {
    "agb_Mg_per_ha": 125.5,
    "carbon_sequestration_kg": 589.85,
    "study_area_ha": 0.1
  },
  "component_results": {
    "satellite": {
      "agb_Mg_per_ha": 120.0,
      "height_m": 8.5,
      "confidence": 0.85,
      "n_points": 10
    },
    "drone": {
      "agb_Mg_per_ha": 130.0,
      "area_m2": 1000,
      "carbon_kg": 611.0,
      "co2_kg": 2240.0,
      "confidence": 0.92
    }
  }
}
```

### Backend API (Node.js)

```
PATCH /api/projects/:id
```

**Updates project with ML results:**
```json
{
  "mlAnalysisResults": {
    "status": "success",
    "job_id": "abc123",
    "final_results": { ... },
    "component_results": { ... }
  }
}
```

---

## Troubleshooting

### Issue: "ML API is not configured"

**Solution:**
- Update `ML_API_BASE` in `services/projectsService.js` with your Ngrok URL
- Make sure it doesn't contain "YOUR_NGROK_URL"

### Issue: "ML analysis failed"

**Possible causes:**
1. ML API server not running
   - Check: `http://localhost:8000/api/health`
   - Restart: `python api_server.py`

2. Ngrok tunnel expired
   - Restart Ngrok: `ngrok http 8000`
   - Update URL in `projectsService.js`

3. Missing model files
   - Check paths in `api_server.py`
   - Verify files exist:
     - `mangrove_model.pkl`
     - `model_bundle_two_stage.joblib`
     - `points.csv`

4. Script errors
   - Check ML API logs in terminal
   - Verify Python scripts can run independently

### Issue: "No projects pending verification"

**Solution:**
- Projects need field verification first
- Use the field verification flow before ML analysis
- Check project status in database

### Issue: Image upload fails

**Possible causes:**
1. File size too large
   - Compress image before upload
   - Check server upload limits

2. Unsupported format
   - Use JPEG or PNG
   - Convert HEIC images first

### Issue: Backend doesn't save ML results

**Solution:**
- Restart backend server to load updated schema
- Check backend logs for errors
- Verify token is valid

---

## Data Flow

```
User Action → VerificationScreen.jsx
     ↓
Select Drone Image (ImagePicker)
     ↓
runMLAnalysis() function
     ↓
Create FormData with image + params
     ↓
POST to ML API (/api/analyze)
     ↓
┌─────────────────────────────────┐
│  ML API Processing              │
│  1. Save drone image            │
│  2. Run randomforest2.py        │
│  3. Run 3mix.py (satellite)     │
│  4. Run integration.py          │
│  5. Calculate CO2 equivalent    │
└─────────────────────────────────┘
     ↓
Return JSON results
     ↓
PATCH /api/projects/:id (save to backend)
     ↓
Display results in modal
     ↓
User approves/rejects with notes
     ↓
Update project status to 'verified'
     ↓
Available in Manage Plots
```

---

## File Structure

```
veriflow_app/
├── screen/
│   ├── VerificationScreen.jsx     ← New: ML verification screen
│   ├── RecordFieldDataScreen.jsx  ← Modified: Added verify button
│   └── ManagePlotsScreen.jsx      ← Shows ML results
├── services/
│   └── projectsService.js         ← Modified: ML API functions
├── App.js                         ← Modified: Added route
└── ML_INTEGRATION_GUIDE.md        ← This file

backend/
├── models/
│   └── Project.js                 ← Modified: Added ML fields
└── controllers/
    └── projectController.js       ← Modified: ML results handling

ML Scripts/ (Your location)
├── api_server.py                  ← FastAPI server
├── 3mix.py                        ← Satellite analysis
├── randomforest2.py               ← Drone analysis
├── integration.py                 ← Combines results
└── points.csv                     ← Satellite points
```

---

## Testing Checklist

- [ ] ML API server running (`python api_server.py`)
- [ ] Ngrok tunnel active (`ngrok http 8000`)
- [ ] URL updated in `projectsService.js`
- [ ] Backend server running (`npm start`)
- [ ] Mobile app running (`npm start`)
- [ ] Can navigate to Verification screen
- [ ] Can select and upload drone image
- [ ] ML analysis completes successfully
- [ ] Results displayed correctly
- [ ] Can approve project with notes
- [ ] ML results visible in Manage Plots

---

## Important Notes

1. **Ngrok URL Changes**: Every time you restart Ngrok, you get a new URL. You must update it in `projectsService.js`

2. **Processing Time**: ML analysis takes 2-5 minutes. Don't close the app during processing.

3. **Field Verification First**: Projects must have field verification before ML analysis.

4. **Model Paths**: Ensure all paths in `api_server.py` point to correct locations of your ML scripts and models.

5. **Data Requirements**: The satellite analysis requires valid coordinates in `points.csv`.

6. **No Breaking Changes**: This integration doesn't modify any existing functionality - it only adds new features.

---

## Support

If you encounter issues:

1. Check backend logs: `backend/` terminal
2. Check ML API logs: Terminal running `api_server.py`
3. Check app logs: React Native developer console
4. Verify all services are running
5. Test ML API health endpoint: `http://localhost:8000/api/health`

---

## Next Steps

After successful integration:

1. Test with real drone images
2. Verify satellite data accuracy
3. Fine-tune manual height parameter
4. Add more validation rules
5. Implement batch processing (future)
6. Add export functionality for reports

---

**Integration Complete!** The verify button now triggers ML analysis using your 3mix.py, randomforest2.py, and integration.py scripts to calculate CO2 equivalent values.
