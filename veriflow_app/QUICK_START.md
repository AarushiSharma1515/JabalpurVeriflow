# 🚀 Quick Start - Verification Screen

## ⚡ 3-Minute Setup

### 1. Update ML API URL (30 seconds)

**File:** `services/projectsService.js` (Line 149-152)

```javascript
const getMLApiUrl = () => {
  return 'https://YOUR_NGROK_URL.ngrok-free.app/api/analyze';
};
```

**Get Ngrok URL:**
```bash
python start_api.py
# Copy the URL shown (e.g., https://abc123.ngrok-free.app)
```

### 2. Start All Servers (1 minute)

**Terminal 1 - Backend:**
```bash
cd ../backend
npm start
```

**Terminal 2 - ML API:**
```bash
cd /path/to/python/scripts
python start_api.py
```

**Terminal 3 - React Native:**
```bash
cd veriflow_app
npm start
# or: expo start
```

### 3. Test the Flow (2 minutes)

1. **Login as admin**
2. **Admin Dashboard → Record Field Data**
3. **Click "Verify" button**
4. **Select a project**
5. **Click "Run ML Analysis"**
6. **Wait 2-5 minutes**
7. **Review results**
8. **Click "Approve" or "Reject"**

---

## 📁 What Was Changed

### ✅ New Files:
- `screen/VerificationScreen.jsx` - Verification screen component
- `VERIFICATION_SETUP_GUIDE.md` - Complete setup guide
- `QUICK_START.md` - This file

### ✅ Modified Files:
- `services/projectsService.js` - Added ML API functions
- `screen/RecordFieldDataScreen.jsx` - Updated verify button
- `App.js` - Added Verification screen to navigation

---

## 🎯 Key Features

### Verification Screen:
- ✅ List all projects pending verification
- ✅ Search and filter projects
- ✅ View project details and images
- ✅ Run ML analysis on project images
- ✅ View ML results (carbon, AGB, confidence)
- ✅ Approve/reject projects with notes
- ✅ Auto-update project status in database

### ML Integration:
- ✅ Automatic image upload to ML API
- ✅ Progress tracking (upload + processing)
- ✅ 2-5 minute analysis time
- ✅ Detailed results display
- ✅ Error handling and retry logic

---

## 🐛 Quick Troubleshooting

### "Network request failed"
→ Check ML API is running: `python start_api.py`
→ Update Ngrok URL in `projectsService.js`

### "No projects pending verification"
→ Create test project from farmer dashboard
→ Or manually update project status to "submitted" in MongoDB

### "Token is required"
→ Login again to refresh token
→ Check AsyncStorage has valid token

### ML Analysis timeout
→ Wait up to 5 minutes (satellite data processing)
→ Check internet connection
→ Reduce image size if >10MB

---

## 📞 Need Help?

**Full documentation:** `VERIFICATION_SETUP_GUIDE.md`

**Key sections:**
- Complete setup instructions
- Testing checklist
- Troubleshooting guide
- API integration details
- Database schema updates

---

## ✨ Next Steps

1. **Update ML API URL** with your Ngrok URL
2. **Test the complete flow** with a sample project
3. **Review the full guide** for advanced features
4. **Deploy to production** (update permanent API URL)

---

**Ready to go!** 🎉

Start all three servers and test the verification flow.
