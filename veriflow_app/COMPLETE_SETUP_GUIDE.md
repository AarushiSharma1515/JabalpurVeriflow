# 🎯 Complete Verification System Setup Guide
## Veriflow Carbon Sequestration App

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [What Was Created](#what-was-created)
4. [User Roles & Workflows](#user-roles--workflows)
5. [Quick Setup](#quick-setup)
6. [Detailed Setup Instructions](#detailed-setup-instructions)
7. [Testing Guide](#testing-guide)
8. [Troubleshooting](#troubleshooting)
9. [Database Schema](#database-schema)
10. [API Documentation](#api-documentation)

---

## 🎯 Overview

The verification system is now split into **two separate flows**:

### **1. Field Operator Flow** (Record Field Data → Verify)
- Field operators run ML analysis
- Add verification notes
- Submit for admin approval
- Status: `draft/submitted` → `underReview`

### **2. Admin Flow** (Manage Plots)
- Admins review field-verified projects
- View ML results and notes
- Approve or reject with notes
- Status: `underReview` → `verified/rejected`

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FIELD OPERATOR WORKFLOW                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                   Record Field Data Screen
                              │
                              ▼
                    Click "Verify" Button
                              │
                              ▼
              ┌───────────────────────────────┐
              │  Field Verification Screen     │
              │  - List projects (draft/      │
              │    submitted status)           │
              │  - Run ML Analysis             │
              │  - Add verification notes      │
              │  - Save & submit for approval  │
              └───────────────────────────────┘
                              │
                              ▼
                 Project status → underReview
                 (with ML results + notes)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      ADMIN WORKFLOW                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    Admin Dashboard
                              │
                              ▼
                    Click "Manage Plots"
                              │
                              ▼
              ┌───────────────────────────────┐
              │    Manage Plots Screen         │
              │  - List all projects           │
              │  - View project details        │
              │  - View ML results             │
              │  - View field notes            │
              │  - Approve/Reject (only for    │
              │    underReview status)         │
              └───────────────────────────────┘
                              │
                              ▼
                 Project status → verified/rejected
                 (with admin notes)
```

---

## 📦 What Was Created

### **New Files:**

1. **`screen/FieldVerificationScreen.jsx`** (40KB)
   - Field operator verification interface
   - ML analysis integration
   - Verification notes submission
   - Status: `draft/submitted` → `underReview`

### **Modified Files:**

1. **`screen/ManagePlotsScreen.jsx`** (Updated - 50KB)
   - Enhanced with approval/rejection modals
   - ML results viewing
   - Field verification info display
   - Admin notes for approval/rejection
   - Status: `underReview` → `verified/rejected`

2. **`screen/RecordFieldDataScreen.jsx`** (Updated)
   - Navigation to FieldVerificationScreen
   - Token management

3. **`App.js`** (Updated)
   - Added FieldVerificationScreen to navigation

4. **`services/projectsService.js`** (Previously updated)
   - ML API integration functions

### **Removed Files:**

1. **`screen/VerificationScreen.jsx`** (Deleted - replaced by FieldVerificationScreen)

---

## 👥 User Roles & Workflows

### **Field Operator (Verification)**

**Access Path:**
```
Record Field Data → Verify Button
```

**Capabilities:**
- ✅ View projects with status: `draft` or `submitted`
- ✅ Run ML analysis on project images
- ✅ View ML results (carbon, AGB, confidence scores)
- ✅ Add field verification notes
- ✅ Submit project for admin approval
- ✅ Upload images if missing

**Cannot Do:**
- ❌ Approve or reject projects
- ❌ Change project status to `verified/rejected`
- ❌ View all projects (only their assigned ones)

**Workflow:**
1. Open "Record Field Data" from dashboard
2. Click "Verify" button
3. Select a project from list
4. Click "Run ML Analysis" (wait 2-5 minutes)
5. Review ML results
6. Add verification notes
7. Click "Save Verification & Submit for Approval"
8. Project status changes to `underReview`

---

### **Admin (Approval/Rejection)**

**Access Path:**
```
Admin Dashboard → Manage Plots
```

**Capabilities:**
- ✅ View ALL projects (all statuses)
- ✅ View complete project details
- ✅ View field verification notes
- ✅ View ML analysis results
- ✅ View project images
- ✅ Approve projects (with ML results)
- ✅ Reject projects (with reason)
- ✅ Add admin notes for both actions

**Special Rules:**
- ✅ Approve button only shown for `underReview` status
- ✅ Reject button only shown for `underReview` status
- ✅ ML results MUST exist to approve
- ✅ Admin notes REQUIRED for both approve/reject

**Workflow:**
1. Open "Admin Dashboard"
2. Click "Manage Plots"
3. Browse all projects
4. Click "Details" on any project
5. Review:
   - Project information
   - Field verification notes
   - ML analysis results
   - Project images
6. For `underReview` projects:
   - Click "Approve" → Add notes → Confirm
   - OR Click "Reject" → Add reason → Confirm
7. Project status changes to `verified` or `rejected`

---

## 🚀 Quick Setup (5 Minutes)

### **Step 1: Update ML API URL** (1 min)

**File:** `services/projectsService.js` (Line 149-152)

```javascript
const getMLApiUrl = () => {
  return 'https://YOUR_NGROK_URL.ngrok-free.app/api/analyze';
};
```

**Get Ngrok URL:**
```bash
# In ML backend folder
python start_api.py
# Copy the URL (e.g., https://abc123.ngrok-free.app)
```

### **Step 2: Start All Servers** (2 min)

```bash
# Terminal 1: Backend Server
cd ../backend
npm start
# Should run on http://10.1.30.65:5001

# Terminal 2: ML API Server
cd /path/to/ml/scripts
python start_api.py
# Note the Ngrok URL

# Terminal 3: React Native App
cd veriflow_app
npm start
# or: expo start
```

### **Step 3: Test the Flow** (2 min)

**Field Operator Test:**
1. Login as field operator
2. Navigate: Dashboard → Record Field Data → Verify
3. Select a project
4. Run ML analysis
5. Add notes and submit

**Admin Test:**
1. Login as admin
2. Navigate: Admin Dashboard → Manage Plots
3. Find `underReview` project
4. View details and ML results
5. Approve or reject with notes

---

## 📚 Detailed Setup Instructions

### **Prerequisites:**

- Node.js and npm installed
- Python 3.x installed
- Ngrok account (free tier works)
- MongoDB running
- Backend server configured
- ML model files present

### **1. Install Dependencies:**

```bash
cd veriflow_app

# Install required packages (if not already installed)
npm install axios expo-image-picker @react-native-async-storage/async-storage
```

### **2. Configure ML API:**

**a. Set up Ngrok:**
```bash
# Install Ngrok (if not installed)
# Visit: https://ngrok.com/download

# Add auth token
ngrok config add-authtoken YOUR_AUTH_TOKEN

# Verify installation
ngrok --version
```

**b. Start ML API Server:**
```bash
cd /path/to/ml/backend/folder
python start_api.py

# You should see:
# ✓ ML API running on http://localhost:8000
# ✓ Ngrok tunnel: https://abc123.ngrok-free.app
```

**c. Update App Configuration:**

Edit `services/projectsService.js`:
```javascript
const getMLApiUrl = () => {
  return 'https://abc123.ngrok-free.app/api/analyze';  // Your Ngrok URL
};
```

### **3. Start Backend Server:**

```bash
cd ../backend
npm start

# Should show:
# Server running on http://10.1.30.65:5001
# Connected to MongoDB
```

### **4. Start React Native App:**

```bash
cd veriflow_app
npm start

# Or use Expo:
expo start

# Scan QR code with Expo Go app
# Or press 'a' for Android, 'i' for iOS
```

---

## 🧪 Testing Guide

### **Phase 1: Field Operator Testing (15 mins)**

#### **Test 1: Basic Navigation**
- [ ] Login as field operator
- [ ] Navigate to "Record Field Data"
- [ ] Click "Verify" button
- [ ] FieldVerificationScreen loads
- [ ] Projects list displays

#### **Test 2: Project Selection**
- [ ] Search for projects
- [ ] Click on a project card
- [ ] Project details modal opens
- [ ] Project information displays correctly
- [ ] Images display (if available)

#### **Test 3: ML Analysis (Without Images)**
- [ ] Click "Run ML Analysis" on project with no images
- [ ] Alert prompts to upload image
- [ ] Click "Upload Image"
- [ ] Image picker opens
- [ ] Select an image
- [ ] Upload progress shows
- [ ] ML analysis runs automatically
- [ ] Results display after 2-5 minutes

#### **Test 4: ML Analysis (With Images)**
- [ ] Click "Run ML Analysis" on project with images
- [ ] Processing modal appears
- [ ] Upload progress shows (0-100%)
- [ ] Processing message shows (2-5 min)
- [ ] Results modal displays
- [ ] Carbon sequestration value shown
- [ ] AGB value shown
- [ ] Satellite results shown
- [ ] Drone results shown
- [ ] Confidence scores shown
- [ ] Metadata shown (job ID, time, area)

#### **Test 5: Verification Submission**
- [ ] After ML analysis completes
- [ ] ML results preview shows on main modal
- [ ] Add verification notes (try without notes first - should fail)
- [ ] Add proper verification notes
- [ ] Click "Save Verification & Submit for Approval"
- [ ] Success message shows
- [ ] Project status changes to `underReview`
- [ ] Project disappears from field operator list

---

### **Phase 2: Admin Testing (20 mins)**

#### **Test 1: Basic Navigation**
- [ ] Login as admin
- [ ] Navigate to "Admin Dashboard"
- [ ] Click "Manage Plots"
- [ ] ManagePlotsScreen loads
- [ ] All projects display (all statuses)

#### **Test 2: Project Details View**
- [ ] Click "Details" button on any project
- [ ] Details modal opens
- [ ] Project information displays
- [ ] Status badge shows correct color
- [ ] Images display (if available)
- [ ] Click on thumbnail → full-screen image opens
- [ ] Close full-screen image viewer

#### **Test 3: Field Verification Info**
- [ ] View project with `underReview` status
- [ ] "Field Verification" section displays
- [ ] Green checkmark shows "Verified"
- [ ] Field operator's notes display

#### **Test 4: ML Results View**
- [ ] Click "ML Results" button on project with ML data
- [ ] ML Results modal opens
- [ ] Carbon sequestration displays
- [ ] AGB displays
- [ ] Satellite component shows (with confidence)
- [ ] Drone component shows (with confidence)
- [ ] Metadata shows (job ID, time, area)
- [ ] Close button works

#### **Test 5: Approval Flow**
- [ ] Find project with `underReview` status
- [ ] "Approve" and "Reject" buttons visible
- [ ] Click "Approve"
- [ ] Approval notes modal opens
- [ ] Try to approve without notes → error
- [ ] Try to approve without ML results → error
- [ ] Add approval notes
- [ ] Click "Approve" button
- [ ] Confirmation works
- [ ] Success message shows
- [ ] Project status changes to `verified`
- [ ] Approve/Reject buttons disappear

#### **Test 6: Rejection Flow**
- [ ] Find another project with `underReview` status
- [ ] Click "Reject"
- [ ] Rejection notes modal opens
- [ ] Try to reject without notes → error
- [ ] Add rejection reason
- [ ] Click "Reject" button
- [ ] Confirmation works
- [ ] Success message shows
- [ ] Project status changes to `rejected`
- [ ] Approve/Reject buttons disappear

#### **Test 7: Status Badge Verification**
- [ ] `draft` projects show gray badge with create icon
- [ ] `submitted` projects show orange badge with time icon
- [ ] `underReview` projects show blue badge with eye icon
- [ ] `verified` projects show green badge with checkmark icon
- [ ] `rejected` projects show red badge with close icon

#### **Test 8: Field Verified Badge**
- [ ] Projects with `fieldVerification.verified = true` show badge
- [ ] Green checkmark icon displays
- [ ] "Field Verified" text shows

#### **Test 9: ML Analysis Badge**
- [ ] Projects with `mlAnalysisResults` show badge
- [ ] Analytics icon displays
- [ ] "ML Analysis Available" text shows
- [ ] "ML Results" button enabled

---

### **Phase 3: Integration Testing (15 mins)**

#### **Test 1: Complete End-to-End Flow**
1. **Field Operator:**
   - [ ] Login as field operator
   - [ ] Create a new project (if needed)
   - [ ] Upload project images
   - [ ] Navigate to Field Verification
   - [ ] Run ML analysis
   - [ ] Add verification notes
   - [ ] Submit for approval
   - [ ] Logout

2. **Admin:**
   - [ ] Login as admin
   - [ ] Navigate to Manage Plots
   - [ ] Find the newly submitted project
   - [ ] Verify status is `underReview`
   - [ ] View project details
   - [ ] Review field verification notes
   - [ ] View ML results
   - [ ] Approve with notes
   - [ ] Verify status is `verified`

#### **Test 2: Multiple Projects**
- [ ] Submit 3 projects from field operator
- [ ] Verify all appear in admin's Manage Plots
- [ ] Approve 1 project
- [ ] Reject 1 project
- [ ] Leave 1 as `underReview`
- [ ] Verify statuses are correct

#### **Test 3: Refresh & Reload**
- [ ] Submit project from field operator
- [ ] Close and reopen app
- [ ] Verify project still shows in admin panel
- [ ] Complete approval
- [ ] Close and reopen app
- [ ] Verify project status persists

---

### **Phase 4: Error Handling Testing (10 mins)**

#### **Test 1: Network Errors**
- [ ] Stop ML API server
- [ ] Try to run ML analysis
- [ ] Error message displays
- [ ] Can retry after restarting server

#### **Test 2: Timeout Handling**
- [ ] Use very large image (>10MB)
- [ ] ML analysis times out gracefully
- [ ] Error message mentions timeout

#### **Test 3: Invalid Token**
- [ ] Clear app data/AsyncStorage
- [ ] Try to access verification screen
- [ ] Redirects to login or shows error

#### **Test 4: Missing ML Results**
- [ ] Manually update project status to `underReview` without ML results
- [ ] Try to approve in admin panel
- [ ] Error shows: "ML Analysis Missing"

#### **Test 5: Empty Notes**
- [ ] Try to save verification without notes
- [ ] Error shows: "Notes Required"
- [ ] Try to approve without notes
- [ ] Error shows: "Notes Required"
- [ ] Try to reject without notes
- [ ] Error shows: "Notes Required"

---

## 🐛 Troubleshooting

### **Issue 1: "Cannot find FieldVerificationScreen"**

**Cause:** Import or navigation misconfiguration

**Solution:**
1. Check `App.js` has correct import:
   ```javascript
   import FieldVerificationScreen from "./screen/FieldVerificationScreen";
   ```
2. Check `App.js` has navigation entry:
   ```javascript
   <Stack.Screen name="FieldVerification" component={FieldVerificationScreen} options={{ headerShown: false }}/>
   ```
3. Restart Metro bundler: `npm start -- --reset-cache`

---

### **Issue 2: "Network request failed" (ML Analysis)**

**Cause:** ML API server not running or Ngrok URL incorrect

**Solution:**
1. Verify ML API server is running:
   ```bash
   python start_api.py
   ```
2. Check Ngrok URL in terminal output
3. Update `services/projectsService.js` with correct URL:
   ```javascript
   const getMLApiUrl = () => {
     return 'https://CORRECT_NGROK_URL.ngrok-free.app/api/analyze';
   };
   ```
4. Restart React Native app
5. Test Ngrok URL in browser first: `https://YOUR_URL.ngrok-free.app/api/health`

---

### **Issue 3: "No projects to verify" (Field Operator)**

**Cause:** No projects with status `draft` or `submitted`

**Solution:**
1. Create a new project from farmer dashboard
2. OR manually update project status in MongoDB:
   ```javascript
   db.projects.updateOne(
     { _id: ObjectId("PROJECT_ID") },
     { $set: { status: "submitted" } }
   )
   ```
3. Refresh the Field Verification screen

---

### **Issue 4: "Approve/Reject buttons not showing"**

**Cause:** Project status is not `underReview`

**Solution:**
1. Verify project status in database
2. Project must be submitted by field operator first
3. Status should be `underReview` (not `draft`, `submitted`, `verified`, or `rejected`)
4. Only `underReview` projects show approve/reject buttons

---

### **Issue 5: "ML Analysis takes too long"**

**Cause:** Large image or slow satellite data download

**Solution:**
1. Compress images before upload (max 1920x1920)
2. Check internet connection speed
3. Wait up to 5 minutes (satellite data processing)
4. Check ML server logs for errors:
   ```bash
   # In ML API terminal
   # Look for error messages or stuck processes
   ```

---

### **Issue 6: "Token is required"**

**Cause:** Token not found in AsyncStorage or route params

**Solution:**
1. Login again to refresh token
2. Check token exists:
   ```javascript
   // In React Native Debugger
   AsyncStorage.getAllKeys()
   .then(keys => console.log(keys))
   ```
3. Verify navigation passes token:
   ```javascript
   navigation.navigate('FieldVerification', { token })
   ```

---

### **Issue 7: Backend returns 500 error**

**Cause:** Server error during API call

**Solution:**
1. Check backend server logs
2. Verify MongoDB connection
3. Check project data structure matches schema
4. Ensure user has admin permissions (for approval/rejection)
5. Check backend routes are correctly configured

---

### **Issue 8: Images not displaying**

**Cause:** Invalid image URLs or permissions

**Solution:**
1. Check image URLs are accessible
2. Verify image upload completed successfully
3. Check image permissions in storage
4. Try re-uploading images

---

## 💾 Database Schema

### **Project Model Updates:**

```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  owner: ObjectId (ref: User),
  location: {
    address: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
    coordinates: { lat: Number, lng: Number }
  },
  areaHectares: Number,
  cropType: String,
  startDate: Date,
  endDate: Date,

  // Status field - KEY FOR WORKFLOW
  status: {
    type: String,
    enum: ['draft', 'submitted', 'underReview', 'verified', 'rejected'],
    default: 'draft'
  },

  images: [{
    filename: String,
    url: String,
    thumbnailUrl: String,
    mimeType: String,
    sizeBytes: Number,
    width: Number,
    height: Number,
    latitude: Number,
    longitude: Number,
    capturedAt: Date,
    uploadedAt: Date,
    description: String
  }],

  // Field Verification (by Field Operator)
  fieldVerification: {
    verified: Boolean,
    notes: String,
    verifiedAt: Date
  },

  // Admin Verification (Final Approval)
  verification: {
    verified: Boolean,
    verifiedBy: ObjectId (ref: User),
    verifiedAt: Date,
    notes: String  // Admin's approval/rejection notes
  },

  // ML Analysis Results (from Python API)
  mlAnalysisResults: {
    job_id: String,
    processing_time_seconds: Number,
    final_results: {
      carbon_sequestration_kg: Number,
      agb_mg_ha: Number,
      study_area_ha: Number
    },
    component_results: {
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
      }
    },
    metadata: {
      image_filename: String,
      start_date: String,
      end_date: String,
      manual_height: Number,
      timestamp: String
    }
  },

  createdAt: Date,
  updatedAt: Date
}
```

### **Status Workflow:**

```
draft
  ↓ (Farmer creates project)
submitted
  ↓ (Field operator starts verification)
underReview
  ↓ (Admin approval/rejection)
verified OR rejected
```

### **Field Verification vs Admin Verification:**

| Field | Set By | Purpose |
|-------|--------|---------|
| `fieldVerification` | Field Operator | Records ML analysis and field notes |
| `verification` | Admin | Final approval/rejection decision |
| `mlAnalysisResults` | ML API | Carbon sequestration data |

---

## 📡 API Documentation

### **ML Analysis API:**

**Endpoint:**
```
POST https://YOUR_NGROK_URL.ngrok-free.app/api/analyze
```

**Headers:**
```
Content-Type: multipart/form-data
```

**Body:**
```javascript
{
  image: File (jpg/png),
  start_date: "2024-01-01",  // ISO date format
  end_date: "2024-12-31",     // ISO date format
  manual_height: 6.23         // Number (meters)
}
```

**Response (Success):**
```javascript
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

**Response (Error):**
```javascript
{
  "detail": "Error message here"
}
```

---

### **Backend API Endpoints:**

#### **Get Projects (Field Operator):**
```
GET /api/projects?status=submitted,draft
Authorization: Bearer TOKEN
```

**Response:**
```javascript
{
  "projects": [
    { /* project object */ },
    { /* project object */ }
  ]
}
```

---

#### **Get All Projects (Admin):**
```
GET /api/projects
Authorization: Bearer TOKEN
```

**Response:**
```javascript
{
  "projects": [
    { /* all projects */ }
  ]
}
```

---

#### **Update Project (Field Verification):**
```
PATCH /api/projects/:projectId
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "status": "underReview",
  "fieldVerification": {
    "verified": true,
    "notes": "Field verification notes here",
    "verifiedAt": "2024-12-09T10:30:00Z"
  },
  "mlAnalysisResults": {
    /* ML API response data */
  }
}
```

---

#### **Update Project (Admin Approval):**
```
PATCH /api/projects/:projectId
Authorization: Bearer TOKEN (Admin)
Content-Type: application/json

{
  "status": "verified",
  "verification": {
    "verified": true,
    "notes": "Admin approval notes here"
  }
}
```

---

#### **Update Project (Admin Rejection):**
```
PATCH /api/projects/:projectId
Authorization: Bearer TOKEN (Admin)
Content-Type: application/json

{
  "status": "rejected",
  "verification": {
    "verified": false,
    "notes": "Rejection reason here"
  }
}
```

---

## ✅ Final Checklist

### **Setup Complete When:**

**Frontend:**
- [x] FieldVerificationScreen.jsx created
- [x] ManagePlotsScreen.jsx updated
- [x] RecordFieldDataScreen.jsx updated
- [x] App.js navigation updated
- [ ] Ngrok URL configured in projectsService.js
- [ ] Dependencies installed
- [ ] App starts without errors

**Backend:**
- [ ] Backend server running on http://10.1.30.65:5001
- [ ] MongoDB connected
- [ ] Project model supports new fields
- [ ] Admin permissions configured

**ML API:**
- [ ] Python dependencies installed
- [ ] ML model files present
- [ ] Ngrok configured
- [ ] API server running
- [ ] Ngrok tunnel active

**Testing:**
- [ ] Field operator can run ML analysis
- [ ] Field operator can submit for approval
- [ ] Admin can view underReview projects
- [ ] Admin can approve with notes
- [ ] Admin can reject with notes
- [ ] Status changes work correctly
- [ ] ML results display properly

---

## 🎉 Success!

You now have a complete two-stage verification system:

1. **Field Operators** verify projects with ML analysis
2. **Admins** review and approve/reject verified projects

Both roles have clear, separate workflows with appropriate permissions and data access.

---

## 📞 Support

**For issues:**
1. Check this guide first
2. Review console logs (React Native, Backend, ML API)
3. Verify all servers are running
4. Test API endpoints individually
5. Check database for correct data structure

**Common Commands:**

```bash
# Reset Metro bundler cache
npm start -- --reset-cache

# View React Native logs
npx react-native log-android
npx react-native log-ios

# Check backend logs
cd ../backend && npm start

# Check ML API logs
python start_api.py

# Test Ngrok URL
curl https://YOUR_URL.ngrok-free.app/api/health
```

---

**Happy Verifying! 🌱**
