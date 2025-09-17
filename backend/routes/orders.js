/**
 * Order Routes
 */

const express = require('express');
const router = express.Router();
const { validateBody, validateQuery, schemas } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const {
    createOrder,
    getUserOrders,
    getOrderById,
    getOrderStatus,
    cancelOrder,
    reorder
} = require('../controllers/orderController');

// All order routes require authentication
router.use(authenticateToken);

// Order management
router.post('/', validateBody(schemas.createOrder), createOrder);
router.get('/', validateQuery(schemas.pagination), getUserOrders);
router.get('/:id', getOrderById);
router.get('/:id/status', getOrderStatus);
router.put('/:id/cancel', cancelOrder);
router.post('/:id/reorder', reorder);

module.exports = router;