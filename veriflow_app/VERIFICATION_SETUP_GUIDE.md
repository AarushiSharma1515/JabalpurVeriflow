# 📋 Verification Screen Setup & Integration Guide

## 🎯 Overview

This guide will help you set up and test the new **Verification Screen** that integrates with the ML model for carbon sequestration analysis in the Veriflow app.

---

## 📦 What Was Created

### **New Files:**

1. **`screen/VerificationScreen.jsx`** - Main verification screen component
2. **`VERIFICATION_SETUP_GUIDE.md`** - This setup guide

### **Modified Files:**

1. **`services/projectsService.js`** - Added ML API integration functions
2. **`screen/RecordFieldDataScreen.jsx`** - Updated verify button navigation
3. **`App.js`** - Added Verification screen to navigation stack

---

## 🚀 Quick Start

### **Step 1: Install Dependencies (if not already installed)**

```bash
cd veriflow_app
npm install axios expo-image-picker @react-native-async-storage/async-storage
```

### **Step 2: Configure ML API URL**

Update the Ngrok URL in `services/projectsService.js`:

```javascript
// Line 149-152 in projectsService.js
const getMLApiUrl = () => {
  // Update this URL with your actual Ngrok URL
  return 'https://YOUR_NGROK_URL.ngrok-free.app/api/analyze';
};
```

**To get your Ngrok URL:**
1. Navigate to the ML backend folder (where Python scripts are located)
2. Run `python start_api.py`
3. Copy the Ngrok URL displayed (e.g., `https://abc123.ngrok-free.app`)
4. Replace `YOUR_NGROK_URL` in the code above

### **Step 3: Start the Backend Server**

```bash
# In the backend directory
cd ../backend
npm start
# Backend should run on http://10.1.30.65:5001
```

### **Step 4: Start the ML API Server**

```bash
# In the ML backend directory (where Python scripts are)
python start_api.py
# Copy the Ngrok URL shown in the terminal
```

### **Step 5: Start the React Native App**

```bash
# In the veriflow_app directory
cd veriflow_app
npm start
# Or use: expo start
```

---

## 🔄 Complete Workflow

### **User Journey:**

```
1. Admin logs in → Admin Dashboard
2. Clicks "Record Field Data" card
3. Clicks "Verify" button
4. Verification Screen opens (shows projects pending verification)
5. Admin selects a project
6. Admin clicks "Run ML Analysis"
7. ML model analyzes the project images (2-5 minutes)
8. Results displayed (carbon sequestration, AGB, confidence scores)
9. Admin adds verification notes
10. Admin approves or rejects the project
11. Project status updated in database
```

---

## 📱 Screen Features

### **VerificationScreen Features:**

#### **1. Project List View**
- Displays all projects with status: `submitted` or `underReview`
- Search functionality (by title, location, crop type)
- Project cards showing:
  - Title and status badge
  - Location information
  - Crop type
  - Area in hectares
  - Number of images
  - Owner name

#### **2. Project Details Modal**
- Complete project information
- Image gallery (thumbnail view)
- Full-screen image viewer
- ML analysis button
- Verification notes input
- Approve/Reject action buttons

#### **3. ML Analysis Modal**
- Upload progress indicator
- Processing status (2-5 minutes)
- Results display:
  - 💚 Carbon Sequestration (kg)
  - 🌳 Biomass/AGB (Mg/ha)
  - 🛰️ Satellite component results
  - 🚁 Drone component results
  - Study area size
  - Confidence scores
  - Processing metadata

#### **4. Image Upload & Analysis**
- If project has no images, prompts to upload
- Uses expo-image-picker
- Compresses images before upload
- Shows upload progress
- Runs ML analysis on uploaded image

---

## 🔧 API Integration Details

### **New API Functions in `projectsService.js`:**

```javascript
// Get projects pending verification
getProjectsForVerification(token, status)

// Run ML analysis on image
runMLAnalysis(imageFile, startDate, endDate, manualHeight, onProgress)

// Update project with verification data
verifyProject(token, projectId, verificationData)

// Approve project with ML results
approveProject(token, projectId, notes, mlResults)

// Reject project with notes
rejectProject(token, projectId, notes)

// Get ML API URL
getMLApiUrl()
```

### **ML API Request Format:**

```javascript
POST https://YOUR_NGROK_URL.ngrok-free.app/api/analyze

Content-Type: multipart/form-data

Body:
- image: File (jpg/png)
- start_date: String ("2024-01-01")
- end_date: String ("2024-12-31")
- manual_height: Number (6.23)
```

### **ML API Response Format:**

```json
{
  "status": "success",
  "job_id": "a1b2c3d4",
  "processing_time_seconds": 245.67,
  "final_results": {
    "carbon_sequestration_kg": 28456.32,
    "agb_mg_ha": 121.45,
    "study_area_ha": 0.39
  },
  "component_results": {
    "satellite": {
      "agb_mg_ha": 115.2,
      "confidence": 0.82,
      "height_m": 7.1
    },
    "drone": {
      "agb_mg_ha": 127.8,
      "confidence": 0.91,
      "area_m2": 3900,
      "openness": 1.23
    }
  },
  "metadata": {
    "image_filename": "plantation.jpg",
    "start_date": "2024-01-01",
    "end_date": "2024-12-31",
    "manual_height": 6.23,
    "timestamp": "2024-12-09T14:32:10"
  }
}
```

---

## 🧪 Testing Checklist

### **Phase 1: Basic Navigation (5 mins)**

- [ ] Login as admin
- [ ] Navigate to Admin Dashboard
- [ ] Click "Record Field Data" card
- [ ] Click "Verify" button
- [ ] Verification screen loads successfully

### **Phase 2: Project List (5 mins)**

- [ ] Projects with status `submitted` or `underReview` are displayed
- [ ] Search bar filters projects correctly
- [ ] Project cards show correct information
- [ ] Status badges display with correct colors
- [ ] Click on a project card opens detail modal

### **Phase 3: Project Details (5 mins)**

- [ ] Modal displays complete project information
- [ ] Images display in thumbnail gallery
- [ ] Click thumbnail opens full-screen viewer
- [ ] Back button closes full-screen viewer
- [ ] Close button closes details modal

### **Phase 4: ML Analysis (10 mins)**

**Prerequisites:**
- ML API server must be running (`python start_api.py`)
- Ngrok URL must be updated in code
- Project must have at least one image

**Test Steps:**
- [ ] Click "Run ML Analysis" button
- [ ] Upload progress shows (if large image)
- [ ] Processing message displays: "Analyzing... (2-5 minutes)"
- [ ] Wait for analysis to complete
- [ ] Results modal displays with all data:
  - [ ] Carbon sequestration value
  - [ ] AGB value
  - [ ] Satellite results with confidence
  - [ ] Drone results with confidence
  - [ ] Metadata (job ID, processing time, study area)

### **Phase 5: Image Upload (if no images) (10 mins)**

- [ ] Click "Run ML Analysis" on project with no images
- [ ] Alert prompts to upload image
- [ ] Image picker opens
- [ ] Select image from gallery
- [ ] Upload progress shows
- [ ] ML analysis runs automatically
- [ ] Results display correctly

### **Phase 6: Verification Actions (5 mins)**

**Test Approve:**
- [ ] Run ML analysis first
- [ ] Add verification notes
- [ ] Click "Approve" button
- [ ] Confirmation alert shows
- [ ] Confirm approval
- [ ] Success message displays
- [ ] Modal closes
- [ ] Project list refreshes
- [ ] Project removed from list (status changed to `verified`)

**Test Reject:**
- [ ] Select another project
- [ ] Add rejection notes (required)
- [ ] Click "Reject" button
- [ ] Confirmation alert shows
- [ ] Confirm rejection
- [ ] Success message displays
- [ ] Modal closes
- [ ] Project list refreshes
- [ ] Project removed from list (status changed to `rejected`)

### **Phase 7: Error Handling (10 mins)**

**Test Without ML Analysis:**
- [ ] Try to approve without running ML analysis
- [ ] Alert displays: "ML Analysis Required"
- [ ] Approval blocked

**Test Network Errors:**
- [ ] Stop ML API server
- [ ] Try to run ML analysis
- [ ] Error alert displays with meaningful message
- [ ] User can retry after restarting server

**Test Timeout:**
- [ ] Use very large image (>10MB)
- [ ] Check if timeout is handled gracefully
- [ ] Error message should mention timeout

**Test Invalid Token:**
- [ ] Clear AsyncStorage
- [ ] Try to access verification screen
- [ ] Should redirect or show error

---

## 🐛 Troubleshooting

### **Issue 1: "Cannot read property 'navigate' of undefined"**

**Cause:** Navigation not properly set up
**Solution:**
- Check that VerificationScreen is added to App.js navigation stack
- Verify import statement is correct
- Restart Metro bundler

### **Issue 2: "Network request failed"**

**Cause:** ML API server not running or Ngrok URL incorrect
**Solution:**
1. Check if ML API server is running: `python start_api.py`
2. Verify Ngrok URL is correct in `projectsService.js`
3. Test Ngrok URL in browser first
4. Check if Ngrok free tier limit reached (40 req/min)

### **Issue 3: "Token is required"**

**Cause:** Token not found in AsyncStorage or route params
**Solution:**
- Login again to refresh token
- Check AsyncStorage has valid token
- Verify token is passed via navigation params

### **Issue 4: "No projects pending verification"**

**Cause:** No projects with status `submitted` or `underReview` in database
**Solution:**
1. Create a test project from farmer dashboard
2. Manually update project status in MongoDB:
   ```javascript
   db.projects.updateOne(
     { _id: ObjectId("PROJECT_ID") },
     { $set: { status: "submitted" } }
   )
   ```

### **Issue 5: ML Analysis Takes Too Long**

**Cause:** Large image file or slow satellite data download
**Solution:**
- Reduce image size (max 1920x1920)
- Check internet connection
- Wait up to 5 minutes for satellite data processing
- Check ML server logs for errors

### **Issue 6: "File upload failed"**

**Cause:** Image file too large or invalid format
**Solution:**
- Compress image before upload
- Verify image format (jpg, png supported)
- Check file size (max 10MB)

### **Issue 7: Backend Returns 500 Error**

**Cause:** Backend server error during verification
**Solution:**
- Check backend server logs
- Verify MongoDB connection
- Check project data structure matches model schema
- Ensure admin token has proper permissions

---

## 🔐 Security Considerations

### **Token Management:**
- Token stored in AsyncStorage
- Token passed via route params
- Token validated on backend for admin operations
- Tokens expire after set duration (check backend config)

### **Admin-Only Access:**
- Verification screen should only be accessible by admins
- Backend validates admin role before allowing project updates
- Non-admin users should not see "Record Field Data" option

### **Data Validation:**
- Project ID validated before API calls
- ML results validated before saving
- Verification notes required for rejection
- Image files checked for valid format and size

---

## 📊 Expected Behavior

### **Successful Verification Flow:**

1. **Initial State:**
   - Project status: `submitted` or `underReview`
   - Project visible in verification list

2. **During Analysis:**
   - Loading indicator shows
   - Upload progress displays (0-100%)
   - Processing message shows: "Analyzing... (2-5 minutes)"

3. **Analysis Complete:**
   - Results modal displays
   - Carbon sequestration value shown
   - Component results (satellite + drone) displayed
   - Confidence scores visible

4. **After Approval:**
   - Project status: `verified`
   - ML results saved to project document
   - Verification notes saved
   - Project removed from verification list
   - Admin can see approved project in "Manage Plots"

5. **After Rejection:**
   - Project status: `rejected`
   - Rejection notes saved
   - Project removed from verification list
   - Farmer notified (if notification system implemented)

---

## 📝 Database Schema Updates

### **Project Model (Backend):**

The verification process updates the following fields:

```javascript
{
  status: "verified" | "rejected",  // Updated status
  verification: {
    verified: true | false,
    verifiedBy: ObjectId,  // Admin user ID (auto-populated by backend)
    verifiedAt: Date,      // Timestamp (auto-populated by backend)
    notes: String          // Verification/rejection notes
  },
  mlAnalysisResults: {     // Only saved on approval
    job_id: String,
    carbon_sequestration_kg: Number,
    agb_mg_ha: Number,
    study_area_ha: Number,
    satellite: {
      agb_mg_ha: Number,
      confidence: Number,
      height_m: Number
    },
    drone: {
      agb_mg_ha: Number,
      confidence: Number,
      area_m2: Number,
      openness: Number
    },
    processing_time_seconds: Number,
    analyzed_at: Date
  }
}
```

---

## 🎨 UI/UX Guidelines

### **Color Scheme:**

- **Primary Blue:** `#4A90E2`, `#5A7FE2`
- **Secondary Purple:** `#7B68EE`
- **Success Green:** `#10b981`
- **Warning Orange:** `#f59e0b`
- **Error Red:** `#ef4444`
- **Neutral Gray:** `#64748b`, `#94a3b8`

### **Status Colors:**

- **Submitted:** Orange (`#f59e0b`)
- **Under Review:** Blue (`#3b82f6`)
- **Verified:** Green (`#10b981`)
- **Rejected:** Red (`#ef4444`)

### **Animations:**

- Modal animations: `slide` (smooth slide up)
- Button press: `activeOpacity={0.7}`
- Loading: `ActivityIndicator` with primary blue
- Transitions: Native navigation transitions

---

## 🔄 Integration with Existing Features

### **Admin Dashboard Integration:**

- Verify button in RecordFieldDataScreen navigates to VerificationScreen
- Token passed automatically via route params
- Maintains existing navigation patterns

### **Manage Plots Integration:**

- Approved projects appear in "Manage Plots" with `verified` status
- ML results can be viewed in project details
- Carbon credits calculated based on ML results

### **Carbon Reports Integration:**

- Approved projects with ML results feed into carbon reports
- Carbon sequestration data aggregated for reporting
- Historical tracking of verified projects

### **Farmer Dashboard Integration:**

- Farmers see their project status updates
- Status changes: `submitted` → `verified` or `rejected`
- Farmers notified of verification outcome (if notifications implemented)

---

## 📞 Support & Debugging

### **Logging:**

Check logs in the following locations:

**React Native App:**
```bash
# Metro bundler terminal
# Shows console.log, errors, warnings
```

**Backend Server:**
```bash
# Backend terminal
# Shows API requests, database operations
```

**ML API Server:**
```bash
# Python script terminal
# Shows ML processing logs, job IDs, errors
```

### **Debug Mode:**

Enable detailed logging in VerificationScreen:

```javascript
// Add to top of VerificationScreen.jsx
const DEBUG = true;

// Add before API calls
if (DEBUG) console.log("API Request:", url, data);

// Add after API responses
if (DEBUG) console.log("API Response:", response.data);
```

### **Common Log Messages:**

**Success:**
```
✅ Token loaded successfully
✅ Projects fetched: 5 projects
✅ ML Analysis complete: Job ID abc123
✅ Project approved: Project ID xyz789
```

**Errors:**
```
❌ Error loading token: [reason]
❌ Error fetching projects: [reason]
❌ ML Analysis error: [reason]
❌ Error approving project: [reason]
```

---

## 🚀 Deployment Checklist

### **Before Production:**

- [ ] Update ML API URL from Ngrok to permanent URL
- [ ] Configure production backend URL
- [ ] Set appropriate API timeouts
- [ ] Add error tracking (Sentry, etc.)
- [ ] Implement rate limiting
- [ ] Add loading states everywhere
- [ ] Test on physical devices (iOS & Android)
- [ ] Verify token expiration handling
- [ ] Add offline mode detection
- [ ] Implement retry mechanisms
- [ ] Add analytics tracking
- [ ] Test with large datasets (100+ projects)
- [ ] Optimize image uploads (compression)
- [ ] Add permission checks (camera, storage)
- [ ] Document admin user creation process
- [ ] Train admins on verification workflow

---

## 📈 Future Enhancements

### **Potential Improvements:**

1. **Batch Verification:**
   - Select multiple projects
   - Run ML analysis in parallel
   - Approve/reject in bulk

2. **Advanced Filters:**
   - Filter by location
   - Filter by crop type
   - Filter by area size
   - Filter by submission date

3. **Verification History:**
   - View all verified/rejected projects
   - Audit trail of verifications
   - Admin activity logs

4. **ML Result Comparison:**
   - Compare multiple analyses
   - Historical analysis tracking
   - Trend visualization

5. **Notifications:**
   - Push notifications for new submissions
   - Email notifications for farmers
   - Status change alerts

6. **Export Functionality:**
   - Export verification reports
   - Download ML results as CSV
   - Generate PDF certificates

7. **Image Analysis Tools:**
   - Image annotation
   - Side-by-side comparison
   - Zoom and pan controls

8. **Offline Support:**
   - Queue verification actions
   - Sync when online
   - Cached project data

---

## 📚 Additional Resources

### **Documentation:**

- [React Navigation Docs](https://reactnavigation.org/)
- [Expo Image Picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/)
- [Axios Documentation](https://axios-http.com/docs/intro)

### **Related Files:**

- Backend Routes: `../backend/routes/projectRoutes.js`
- Backend Controller: `../backend/controllers/projectController.js`
- Project Model: `../backend/models/Project.js`
- ML Integration Guide: `REACT_NATIVE_INTEGRATION.md`

### **Contact:**

For issues or questions:
1. Check this guide first
2. Review console logs
3. Check backend server logs
4. Check ML API server logs
5. Contact development team with:
   - Error messages
   - Screenshots
   - Steps to reproduce
   - Device/platform info

---

## ✅ Final Checklist

**Setup Complete When:**

- [x] VerificationScreen created
- [x] ML API functions added to projectsService
- [x] RecordFieldDataScreen updated
- [x] App.js navigation stack updated
- [ ] Ngrok URL configured
- [ ] Backend server running
- [ ] ML API server running
- [ ] App starts without errors
- [ ] Navigation to verification screen works
- [ ] Projects load successfully
- [ ] ML analysis completes successfully
- [ ] Approval/rejection updates database

---

## 🎉 You're All Set!

The verification screen is now integrated and ready to use. Follow the testing checklist to verify everything works correctly.

**Quick Start Command:**

```bash
# Terminal 1: Backend
cd backend && npm start

# Terminal 2: ML API
python start_api.py

# Terminal 3: React Native
cd veriflow_app && npm start
```

**Test the flow:**
1. Login as admin
2. Navigate: Admin Dashboard → Record Field Data → Verify
3. Select a project
4. Run ML analysis
5. Approve with notes

**Need help?** Refer to the troubleshooting section or check the logs!
