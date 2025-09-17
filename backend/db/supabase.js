/**
 * Supabase client configuration
 * Handles database connections and authentication
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Validate required environment variables
if (!process.env.SUPABASE_URL) {
    throw new Error('SUPABASE_URL is required');
}

if (!process.env.SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_ANON_KEY is required');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}

// Create Supabase client with anon key (for client-side operations)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
        auth: {
            autoRefreshToken: true,
            persistSession: false
        }
    }
);

// Create Supabase admin client with service role key (for server-side operations)
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

/**
 * Test database connection
 */
const testConnection = async () => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('count')
            .limit(1);
        
        if (error) {
            console.error('Database connection test failed:', error.message);
            return false;
        }
        
        console.log('✅ Database connection successful');
        return true;
    } catch (error) {
        console.error('Database connection test failed:', error.message);
        return false;
    }
};

module.exports = {
    supabase,
    supabaseAdmin,
    testConnection
};