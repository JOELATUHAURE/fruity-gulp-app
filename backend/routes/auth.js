/**
 * Authentication Routes
 */

const express = require('express');
const router = express.Router();
const { validateBody, schemas } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const {
    signup,
    login,
    getProfile,
    updateProfile,
    logout
} = require('../controllers/authController');

// Public routes
router.post('/signup', validateBody(schemas.signup), signup);
router.post('/login', validateBody(schemas.login), login);

// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.post('/logout', authenticateToken, logout);

module.exports = router;