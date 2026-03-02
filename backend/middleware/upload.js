const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the uploads directory exists to prevent crashes
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Local Storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    
    // Fallback: If the browser blob doesn't have an extension, force .webm for videos
    let ext = path.extname(file.originalname);
    if (!ext && file.mimetype.startsWith('video/')) {
        ext = '.webm';
    }

    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File Filter (Accepts PDFs, Docs, Images, AND VIDEOS)
const fileFilter = (req, file, cb) => {
  // 🔴 FIX: Immediately accept any video type without checking extension strings
  if (file.mimetype.startsWith('video/')) {
      return cb(null, true);
  }

  const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDFs, Docs, Images, and Videos are allowed!'));
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // Increased to 100MB for safe video uploads
});

module.exports = upload;