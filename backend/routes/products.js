/**
 * Product Routes
 */

const express = require('express');
const router = express.Router();
const { validateQuery, schemas } = require('../middleware/validation');
const { optionalAuth } = require('../middleware/auth');
const {
    getAllProducts,
    getProductById,
    getProductsByCategory,
    getFeaturedProducts,
    searchProducts,
    getCategories
} = require('../controllers/productController');

// Public routes
router.get('/', validateQuery(schemas.pagination), optionalAuth, getAllProducts);
router.get('/featured', optionalAuth, getFeaturedProducts);
router.get('/categories', getCategories);
router.get('/search', optionalAuth, searchProducts);
router.get('/category/:category', validateQuery(schemas.pagination), optionalAuth, getProductsByCategory);
router.get('/:id', optionalAuth, getProductById);

module.exports = router;