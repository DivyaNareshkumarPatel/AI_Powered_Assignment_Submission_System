const express = require('express');
const router = express.Router();
const { lookupUser, registerUser, loginUser } = require('../controllers/authController');

router.post('/lookup', lookupUser);

router.post('/signup', registerUser);

router.post('/login', loginUser);

module.exports = router;