// const multer = require('multer');
// const { CloudinaryStorage } = require('multer-storage-cloudinary');
// const cloudinary = require('../config/cloudinary');

// const storage = new CloudinaryStorage({
//     cloudinary: cloudinary,
//     params: async (req, file) => {
//         // 1. Determine the resource type
//         let resourceType = 'auto'; // Default to auto
//         let folder = 'veriviva_assignments';
//         let format = undefined;

//         if (file.mimetype === 'application/pdf') {
//             // Force PDF format to prevent image conversion issues
//             format = 'pdf';
//         } else if (
//             file.mimetype === 'application/msword' || 
//             file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
//         ) {
//             // Word docs must be 'raw' to be stored correctly
//             resourceType = 'raw'; 
//         }

//         return {
//             folder: folder,
//             resource_type: resourceType,
//             format: format, // Explicitly set format for PDFs
//             public_id: file.originalname.split('.')[0] + '-' + Date.now() // Keep original name + timestamp
//         };
//     },
// });

// // File Filter to reject unwanted files
// const fileFilter = (req, file, cb) => {
//     const allowedMimeTypes = [
//         'application/pdf',
//         'application/msword',
//         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//         'image/jpeg',
//         'image/png',
//         'image/jpg'
//     ];

//     if (allowedMimeTypes.includes(file.mimetype)) {
//         cb(null, true);
//     } else {
//         cb(new Error('Invalid file type. Only PDF, Doc, Docx, and Images are allowed.'), false);
//     }
// };

// const upload = multer({
//     storage: storage,
//     limits: { fileSize: 10 * 1024 * 1024 },
//     fileFilter: fileFilter
// });

// module.exports = upload;

const multer = require('multer');
const path = require('path');

// Configure Local Storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Save files to 'uploads' folder
  },
  filename: function (req, file, cb) {
    // Save as: fieldname-timestamp.pdf
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File Filter (Optional: Only accept PDFs and Docs)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDFs, Docs, and Images are allowed!'));
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

module.exports = upload;