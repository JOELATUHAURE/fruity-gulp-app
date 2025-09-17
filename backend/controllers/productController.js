/**
 * Product Controller
 * Handles product-related operations
 */

const { supabase } = require('../db/supabase');

/**
 * Get all products with optional filtering and pagination
 */
const getAllProducts = async (req, res) => {
    try {
        const { page = 1, limit = 20, category, search, sort = 'created_at', order = 'desc' } = req.query;
        
        let query = supabase
            .from('products')
            .select('*', { count: 'exact' })
            .eq('is_available', true);

        // Apply filters
        if (category) {
            query = query.eq('category', category);
        }

        if (search) {
            query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
        }

        // Apply sorting
        query = query.order(sort, { ascending: order === 'asc' });

        // Apply pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data: products, error, count } = await query;

        if (error) {
            console.error('Get products error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch products'
            });
        }

        // Calculate pagination info
        const totalPages = Math.ceil(count / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        res.json({
            success: true,
            data: products,
            pagination: {
                current_page: parseInt(page),
                total_pages: totalPages,
                total_items: count,
                items_per_page: parseInt(limit),
                has_next_page: hasNextPage,
                has_prev_page: hasPrevPage
            }
        });

    } catch (error) {
        console.error('Get all products error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Get product by ID
 */
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .eq('is_available', true)
            .single();

        if (error || !product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            data: product
        });

    } catch (error) {
        console.error('Get product by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product'
        });
    }
};

/**
 * Get products by category
 */
const getProductsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data: products, error, count } = await supabase
            .from('products')
            .select('*', { count: 'exact' })
            .eq('category', category)
            .eq('is_available', true)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            console.error('Get products by category error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch products'
            });
        }

        const totalPages = Math.ceil(count / limit);

        res.json({
            success: true,
            data: products,
            pagination: {
                current_page: parseInt(page),
                total_pages: totalPages,
                total_items: count,
                items_per_page: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Get products by category error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Get featured products
 */
const getFeaturedProducts = async (req, res) => {
    try {
        const { limit = 6 } = req.query;

        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_available', true)
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (error) {
            console.error('Get featured products error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch featured products'
            });
        }

        res.json({
            success: true,
            data: products
        });

    } catch (error) {
        console.error('Get featured products error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Search products
 */
const searchProducts = async (req, res) => {
    try {
        const { q: query, page = 1, limit = 20 } = req.query;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters long'
            });
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data: products, error, count } = await supabase
            .from('products')
            .select('*', { count: 'exact' })
            .eq('is_available', true)
            .or(`name.ilike.%${query}%,description.ilike.%${query}%,ingredients.cs.["${query}"]`)
            .order('name')
            .range(from, to);

        if (error) {
            console.error('Search products error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to search products'
            });
        }

        const totalPages = Math.ceil(count / limit);

        res.json({
            success: true,
            data: products,
            pagination: {
                current_page: parseInt(page),
                total_pages: totalPages,
                total_items: count,
                items_per_page: parseInt(limit)
            },
            search_query: query
        });

    } catch (error) {
        console.error('Search products error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Get product categories
 */
const getCategories = async (req, res) => {
    try {
        const { data: categories, error } = await supabase
            .from('products')
            .select('category')
            .eq('is_available', true)
            .group('category');

        if (error) {
            console.error('Get categories error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch categories'
            });
        }

        const uniqueCategories = [...new Set(categories.map(item => item.category))];

        res.json({
            success: true,
            data: uniqueCategories
        });

    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    getAllProducts,
    getProductById,
    getProductsByCategory,
    getFeaturedProducts,
    searchProducts,
    getCategories
};