const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ensure uploads directory exists at runtime
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({ storage });

// Public: list and view
router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProjectById);

// Protected: create, update, and delete
router.post('/', authMiddleware, projectController.createProject);
router.patch('/:id', authMiddleware, projectController.updateProject);
router.delete('/:id', authMiddleware, projectController.deleteProject);

// Upload image to project (multipart/form-data, field name: image)
router.post('/:id/images', authMiddleware, upload.single('image'), projectController.uploadProjectImage);

module.exports = router;
