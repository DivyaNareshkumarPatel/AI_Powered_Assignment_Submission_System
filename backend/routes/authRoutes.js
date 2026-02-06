const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { lookupUser, registerUser, loginUser, uploadFace } = require('../controllers/authController');

router.post('/lookup', lookupUser);

router.post('/signup', registerUser);

router.post('/login', loginUser);

router.post('/upload-face', upload.single('face_image'), uploadFace);

module.exports = router;