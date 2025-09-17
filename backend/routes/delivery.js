/**
 * Delivery Routes
 */

const express = require('express');
const router = express.Router();
const { validateQuery, schemas } = require('../middleware/validation');
const { optionalAuth } = require('../middleware/auth');
const {
    getDeliveryFee,
    getOutlets,
    getOutletById,
    checkDeliveryAvailability
} = require('../controllers/deliveryController');

// Delivery routes
router.get('/fee', validateQuery(schemas.getDeliveryFee), optionalAuth, getDeliveryFee);
router.get('/availability', validateQuery(schemas.getDeliveryFee), optionalAuth, checkDeliveryAvailability);
router.get('/outlets', optionalAuth, getOutlets);
router.get('/outlets/:id', optionalAuth, getOutletById);

module.exports = router;