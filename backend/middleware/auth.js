/**
 * Authentication middleware
 * Handles JWT token verification and user authentication
 */

const jwt = require('jsonwebtoken');
const { supabase } = require('../db/supabase');

/**
 * Verify JWT token and authenticate user
 */
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        // Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(403).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        // Get user profile from our users table
        const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('auth_user_id', user.id)
            .single();

        if (profileError) {
            console.error('Error fetching user profile:', profileError);
            return res.status(500).json({
                success: false,
                message: 'Error fetching user profile'
            });
        }

        // Attach user info to request
        req.user = {
            id: userProfile.id,
            auth_user_id: user.id,
            email: user.email,
            name: userProfile.name,
            phone: userProfile.phone
        };

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(403).json({
            success: false,
            message: 'Token verification failed'
        });
    }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            req.user = null;
            return next();
        }

        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            req.user = null;
            return next();
        }

        const { data: userProfile } = await supabase
            .from('users')
            .select('*')
            .eq('auth_user_id', user.id)
            .single();

        req.user = userProfile ? {
            id: userProfile.id,
            auth_user_id: user.id,
            email: user.email,
            name: userProfile.name,
            phone: userProfile.phone
        } : null;

        next();
    } catch (error) {
        req.user = null;
        next();
    }
};

module.exports = {
    authenticateToken,
    optionalAuth
};