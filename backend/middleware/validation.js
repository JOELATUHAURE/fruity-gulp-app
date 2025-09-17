/**
 * Request validation middleware using Joi
 */

const Joi = require('joi');

/**
 * Validate request body against schema
 */
const validateBody = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body);
        
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }))
            });
        }
        
        req.body = value;
        next();
    };
};

/**
 * Validate query parameters against schema
 */
const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query);
        
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Query validation error',
                errors: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }))
            });
        }
        
        req.query = value;
        next();
    };
};

/**
 * Common validation schemas
 */
const schemas = {
    // Authentication schemas
    signup: Joi.object({
        name: Joi.string().min(2).max(255).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional()
    }),

    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    }),

    // Order schemas
    createOrder: Joi.object({
        items: Joi.array().items(
            Joi.object({
                product_id: Joi.string().uuid().required(),
                quantity_litres: Joi.number().positive().max(10).required()
            })
        ).min(1).required(),
        delivery_address: Joi.object({
            street: Joi.string().required(),
            city: Joi.string().required(),
            district: Joi.string().required()
        }).required(),
        delivery_lat: Joi.number().min(-90).max(90).required(),
        delivery_lng: Joi.number().min(-180).max(180).required(),
        payment_method: Joi.string().valid('cash', 'mobile_money', 'card').default('cash'),
        notes: Joi.string().max(500).optional()
    }),

    // Recommendation schema
    getRecommendations: Joi.object({
        symptoms: Joi.array().items(Joi.string()).min(1).required(),
        allergies: Joi.array().items(Joi.string()).default([])
    }),

    // Delivery fee schema
    getDeliveryFee: Joi.object({
        lat: Joi.number().min(-90).max(90).required(),
        lng: Joi.number().min(-180).max(180).required()
    }),

    // Pagination schema
    pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        sort: Joi.string().valid('name', 'price', 'created_at').default('created_at'),
        order: Joi.string().valid('asc', 'desc').default('desc')
    })
};

module.exports = {
    validateBody,
    validateQuery,
    schemas
};