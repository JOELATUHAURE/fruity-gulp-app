/**
 * Authentication Controller
 * Handles user registration, login, and profile management
 */

const { supabase, supabaseAdmin } = require('../db/supabase');
const { sanitizeInput } = require('../utils/helpers');

/**
 * Register a new user
 */
const signup = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: sanitizeInput(email),
            password,
            email_confirm: true
        });

        if (authError) {
            console.error('Auth signup error:', authError);
            return res.status(400).json({
                success: false,
                message: authError.message || 'Failed to create account'
            });
        }

        // Create user profile in our users table
        const { data: userData, error: userError } = await supabase
            .from('users')
            .insert([{
                auth_user_id: authData.user.id,
                name: sanitizeInput(name),
                email: sanitizeInput(email),
                phone: phone ? sanitizeInput(phone) : null
            }])
            .select()
            .single();

        if (userError) {
            console.error('User profile creation error:', userError);
            // Clean up auth user if profile creation fails
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            
            return res.status(500).json({
                success: false,
                message: 'Failed to create user profile'
            });
        }

        // Generate session for the user
        const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'signup',
            email: email
        });

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            data: {
                user: {
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    phone: userData.phone
                },
                auth: {
                    access_token: sessionData?.properties?.access_token,
                    refresh_token: sessionData?.properties?.refresh_token
                }
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during signup'
        });
    }
};

/**
 * Login user
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Sign in with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: sanitizeInput(email),
            password
        });

        if (authError) {
            return res.status(401).json({
                success: false,
                message: authError.message || 'Invalid credentials'
            });
        }

        // Get user profile
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('auth_user_id', authData.user.id)
            .single();

        if (userError) {
            console.error('User profile fetch error:', userError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch user profile'
            });
        }

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    phone: userData.phone
                },
                auth: {
                    access_token: authData.session.access_token,
                    refresh_token: authData.session.refresh_token,
                    expires_at: authData.session.expires_at
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during login'
        });
    }
};

/**
 * Get user profile
 */
const getProfile = async (req, res) => {
    try {
        const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', req.user.id)
            .single();

        if (error) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found'
            });
        }

        res.json({
            success: true,
            data: {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                phone: userData.phone,
                created_at: userData.created_at
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
    try {
        const { name, phone } = req.body;
        
        const updateData = {};
        if (name) updateData.name = sanitizeInput(name);
        if (phone) updateData.phone = sanitizeInput(phone);
        updateData.updated_at = new Date().toISOString();

        const { data: userData, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', req.user.id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Failed to update profile'
            });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                phone: userData.phone
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
};

/**
 * Logout user
 */
const logout = async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            console.error('Logout error:', error);
        }

        res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to logout'
        });
    }
};

module.exports = {
    signup,
    login,
    getProfile,
    updateProfile,
    logout
};