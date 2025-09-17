/**
 * Delivery Controller
 * Handles delivery fee calculation and outlet management
 */

const { supabase } = require('../db/supabase');
const { calculateDeliveryFee, isValidCoordinate } = require('../utils/helpers');

/**
 * Calculate delivery fee based on user location
 */
const getDeliveryFee = async (req, res) => {
    try {
        const { lat, lng } = req.query;

        // Validate coordinates
        if (!isValidCoordinate(parseFloat(lat), parseFloat(lng))) {
            return res.status(400).json({
                success: false,
                message: 'Invalid coordinates provided'
            });
        }

        // Get nearest outlet using the database function
        const { data: nearestOutlet, error } = await supabase
            .rpc('get_nearest_outlet', {
                user_lat: parseFloat(lat),
                user_lng: parseFloat(lng)
            })
            .single();

        if (error) {
            console.error('Get nearest outlet error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to find nearest outlet'
            });
        }

        if (!nearestOutlet) {
            return res.status(404).json({
                success: false,
                message: 'No outlets available in your area'
            });
        }

        const deliveryFee = calculateDeliveryFee(nearestOutlet.distance_km);

        // Calculate estimated delivery time (30 min base + 10 min per km)
        const baseTimeMinutes = 30;
        const perKmMinutes = 10;
        const estimatedMinutes = baseTimeMinutes + (perKmMinutes * nearestOutlet.distance_km);

        res.json({
            success: true,
            data: {
                nearest_outlet: {
                    id: nearestOutlet.outlet_id,
                    name: nearestOutlet.outlet_name,
                    address: nearestOutlet.outlet_address,
                    distance_km: parseFloat(nearestOutlet.distance_km).toFixed(2)
                },
                delivery_fee: deliveryFee,
                estimated_delivery_minutes: Math.ceil(estimatedMinutes),
                delivery_available: nearestOutlet.distance_km <= 20 // Max 20km delivery radius
            }
        });

    } catch (error) {
        console.error('Get delivery fee error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Get all available outlets
 */
const getOutlets = async (req, res) => {
    try {
        const { lat, lng } = req.query;

        let query = supabase
            .from('outlets')
            .select('*')
            .eq('is_active', true)
            .order('name');

        const { data: outlets, error } = await query;

        if (error) {
            console.error('Get outlets error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch outlets'
            });
        }

        // If user location provided, calculate distances
        if (lat && lng && isValidCoordinate(parseFloat(lat), parseFloat(lng))) {
            const outletsWithDistance = outlets.map(outlet => {
                // Use the database function to calculate distance
                return {
                    ...outlet,
                    // Distance will be calculated on the client side or in a separate call
                    // to avoid complex async operations in map
                };
            });

            // Sort by distance if coordinates provided
            // This would require individual distance calculations
            res.json({
                success: true,
                data: outlets,
                user_location: { lat: parseFloat(lat), lng: parseFloat(lng) }
            });
        } else {
            res.json({
                success: true,
                data: outlets
            });
        }

    } catch (error) {
        console.error('Get outlets error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Get outlet by ID
 */
const getOutletById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: outlet, error } = await supabase
            .from('outlets')
            .select('*')
            .eq('id', id)
            .eq('is_active', true)
            .single();

        if (error || !outlet) {
            return res.status(404).json({
                success: false,
                message: 'Outlet not found'
            });
        }

        res.json({
            success: true,
            data: outlet
        });

    } catch (error) {
        console.error('Get outlet by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch outlet'
        });
    }
};

/**
 * Check delivery availability for a location
 */
const checkDeliveryAvailability = async (req, res) => {
    try {
        const { lat, lng } = req.query;

        if (!isValidCoordinate(parseFloat(lat), parseFloat(lng))) {
            return res.status(400).json({
                success: false,
                message: 'Invalid coordinates provided'
            });
        }

        const { data: nearestOutlet, error } = await supabase
            .rpc('get_nearest_outlet', {
                user_lat: parseFloat(lat),
                user_lng: parseFloat(lng)
            })
            .single();

        if (error) {
            console.error('Check delivery availability error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to check delivery availability'
            });
        }

        const maxDeliveryDistance = 20; // 20km max delivery radius
        const isAvailable = nearestOutlet && nearestOutlet.distance_km <= maxDeliveryDistance;

        res.json({
            success: true,
            data: {
                delivery_available: isAvailable,
                distance_km: nearestOutlet ? parseFloat(nearestOutlet.distance_km).toFixed(2) : null,
                max_delivery_distance: maxDeliveryDistance,
                nearest_outlet: nearestOutlet ? {
                    id: nearestOutlet.outlet_id,
                    name: nearestOutlet.outlet_name,
                    address: nearestOutlet.outlet_address
                } : null,
                message: isAvailable 
                    ? 'Delivery available in your area' 
                    : nearestOutlet 
                        ? 'Location is outside our delivery area' 
                        : 'No outlets found in your area'
            }
        });

    } catch (error) {
        console.error('Check delivery availability error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    getDeliveryFee,
    getOutlets,
    getOutletById,
    checkDeliveryAvailability
};