/**
 * Recommendation Routes
 */

const express = require('express');
const router = express.Router();
const { validateBody, schemas } = require('../middleware/validation');
const { optionalAuth } = require('../middleware/auth');
const {
    getRecommendations,
    getAvailableSymptoms,
    getHealthBenefits
} = require('../controllers/recommendationController');

// Recommendation routes
router.post('/', validateBody(schemas.getRecommendations), optionalAuth, getRecommendations);
router.get('/symptoms', getAvailableSymptoms);
router.get('/health-benefits', getHealthBenefits);

module.exports = router;