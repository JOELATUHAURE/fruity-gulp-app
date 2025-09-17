-- Fruity Gulp Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only see and update their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- Outlets table
CREATE TABLE IF NOT EXISTS outlets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    geom GEOMETRY(POINT, 4326),
    phone VARCHAR(20),
    operating_hours JSONB DEFAULT '{"monday": "08:00-20:00", "tuesday": "08:00-20:00", "wednesday": "08:00-20:00", "thursday": "08:00-20:00", "friday": "08:00-20:00", "saturday": "08:00-20:00", "sunday": "10:00-18:00"}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spatial index for outlets
CREATE INDEX IF NOT EXISTS outlets_geom_idx ON outlets USING GIST (geom);

-- Function to automatically set geom from lat/lng
CREATE OR REPLACE FUNCTION set_outlet_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update geom
CREATE TRIGGER outlet_geom_trigger
    BEFORE INSERT OR UPDATE ON outlets
    FOR EACH ROW
    EXECUTE FUNCTION set_outlet_geom();

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_per_litre DECIMAL(10, 2) NOT NULL,
    ingredients JSONB NOT NULL DEFAULT '[]',
    nutritional_info JSONB DEFAULT '{"calories_per_100ml": 0, "sugar_per_100ml": 0, "protein_per_100ml": 0, "fat_per_100ml": 0}',
    image_url TEXT,
    category VARCHAR(100) DEFAULT 'juice',
    health_benefits JSONB DEFAULT '[]',
    allergens JSONB DEFAULT '[]',
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for products (public read access)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available products" ON products
    FOR SELECT USING (is_available = true);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    outlet_id UUID REFERENCES outlets(id),
    total_amount DECIMAL(10, 2) NOT NULL,
    delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
    payment_method VARCHAR(50) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'mobile_money', 'card')),
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    delivery_address JSONB,
    delivery_lat DECIMAL(10, 8),
    delivery_lng DECIMAL(11, 8),
    estimated_delivery_time TIMESTAMP WITH TIME ZONE,
    rider_info JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can create own orders" ON orders
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity_litres DECIMAL(5, 3) NOT NULL DEFAULT 0.5,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order items" ON order_items
    FOR SELECT USING (order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())));

CREATE POLICY "Users can create own order items" ON order_items
    FOR INSERT WITH CHECK (order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())));

-- Symptoms to ingredients mapping table (for AI recommendations)
CREATE TABLE IF NOT EXISTS symptoms_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symptom VARCHAR(255) NOT NULL,
    recommended_ingredients JSONB NOT NULL DEFAULT '[]',
    avoid_ingredients JSONB DEFAULT '[]',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for symptoms_ingredients (public read access)
ALTER TABLE symptoms_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view symptoms mapping" ON symptoms_ingredients
    FOR SELECT USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(is_available);

-- Function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance(lat1 DECIMAL, lng1 DECIMAL, lat2 DECIMAL, lng2 DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
    RETURN ST_Distance(
        ST_SetSRID(ST_MakePoint(lng1, lat1), 4326)::geography,
        ST_SetSRID(ST_MakePoint(lng2, lat2), 4326)::geography
    ) / 1000; -- Convert to kilometers
END;
$$ LANGUAGE plpgsql;

-- Function to get nearest outlet
CREATE OR REPLACE FUNCTION get_nearest_outlet(user_lat DECIMAL, user_lng DECIMAL)
RETURNS TABLE(
    outlet_id UUID,
    outlet_name VARCHAR,
    outlet_address TEXT,
    distance_km DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        o.address,
        calculate_distance(user_lat, user_lng, o.lat, o.lng) as distance
    FROM outlets o
    WHERE o.is_active = true
    ORDER BY distance
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data
INSERT INTO outlets (name, address, lat, lng, phone) VALUES
('Fruity Gulp Kampala Central', 'Plot 123, Kampala Road, Kampala', 0.3476, 32.5825, '+256700123456'),
('Fruity Gulp Garden City', 'Garden City Mall, Kampala', 0.3354, 32.6014, '+256700123457'),
('Fruity Gulp Ntinda', 'Ntinda Shopping Complex, Kampala', 0.3676, 32.6147, '+256700123458');

INSERT INTO products (name, description, price_per_litre, ingredients, nutritional_info, image_url, health_benefits, allergens) VALUES
('Mango Tango', 'A tropical blend of ripe mangoes, passion fruit, and a hint of ginger', 15000, '["mango", "passion fruit", "ginger", "water"]', '{"calories_per_100ml": 120, "sugar_per_100ml": 25, "protein_per_100ml": 1, "fat_per_100ml": 0}', 'https://example.com/mango-tango.jpg', '["vitamin_c", "antioxidants", "digestive_health"]', '[]'),
('Green Revitalizer', 'Spinach, cucumber, apple, and lemon for ultimate detox', 18000, '["spinach", "cucumber", "apple", "lemon", "water"]', '{"calories_per_100ml": 45, "sugar_per_100ml": 8, "protein_per_100ml": 2, "fat_per_100ml": 0}', 'https://example.com/green-revitalizer.jpg', '["detox", "iron", "vitamin_k", "hydration"]', '[]'),
('Citrus Sunrise', 'Orange, grapefruit, and lime with a touch of mint', 12000, '["orange", "grapefruit", "lime", "mint", "water"]', '{"calories_per_100ml": 100, "sugar_per_100ml": 20, "protein_per_100ml": 1, "fat_per_100ml": 0}', 'https://example.com/citrus-sunrise.jpg', '["vitamin_c", "immunity_boost", "energy"]', '[]'),
('Berry Blast', 'Mixed berries with banana and coconut water', 20000, '["strawberry", "blueberry", "raspberry", "banana", "coconut water"]', '{"calories_per_100ml": 150, "sugar_per_100ml": 30, "protein_per_100ml": 2, "fat_per_100ml": 1}', 'https://example.com/berry-blast.jpg', '["antioxidants", "heart_health", "brain_function"]', '[]'),
('Pineapple Paradise', 'Pineapple, coconut, and lime for tropical refreshment', 16000, '["pineapple", "coconut", "lime", "water"]', '{"calories_per_100ml": 110, "sugar_per_100ml": 22, "protein_per_100ml": 1, "fat_per_100ml": 0}', 'https://example.com/pineapple-paradise.jpg', '["digestive_enzymes", "vitamin_c", "anti_inflammatory"]', '[]'),
('Immunity Boost', 'Carrot, orange, turmeric, and ginger power blend', 17000, '["carrot", "orange", "turmeric", "ginger", "water"]', '{"calories_per_100ml": 95, "sugar_per_100ml": 18, "protein_per_100ml": 2, "fat_per_100ml": 0}', 'https://example.com/immunity-boost.jpg', '["immunity", "anti_inflammatory", "vitamin_a", "vitamin_c"]', '[]');

INSERT INTO symptoms_ingredients (symptom, recommended_ingredients, avoid_ingredients, description) VALUES
('flu', '["orange", "ginger", "turmeric", "lemon", "carrot"]', '["dairy"]', 'Vitamin C and anti-inflammatory ingredients help fight flu symptoms'),
('fatigue', '["banana", "spinach", "apple", "coconut water", "berries"]', '["high_sugar"]', 'Natural sugars and electrolytes provide sustained energy'),
('detox', '["spinach", "cucumber", "lemon", "apple", "celery"]', '["processed_ingredients"]', 'Green vegetables and citrus help cleanse the body'),
('headache', '["cucumber", "mint", "coconut water", "watermelon"]', '["caffeine", "artificial_sweeteners"]', 'Hydrating ingredients help relieve headaches'),
('digestive_issues', '["ginger", "pineapple", "mint", "papaya"]', '["dairy", "high_fiber"]', 'Digestive enzymes and soothing ingredients aid digestion'),
('stress', '["berries", "banana", "coconut water", "mint"]', '["caffeine", "high_sugar"]', 'Antioxidants and calming ingredients help reduce stress'),
('cold', '["orange", "lemon", "ginger", "turmeric", "honey"]', '["dairy", "cold_ingredients"]', 'Immune-boosting ingredients help fight cold symptoms'),
('low_energy', '["banana", "apple", "coconut water", "berries", "spinach"]', '["artificial_ingredients"]', 'Natural sugars and nutrients provide clean energy');