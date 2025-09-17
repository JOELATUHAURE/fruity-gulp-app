/**
 * Order Controller
 * Handles order creation, tracking, and management
 */

const { supabase } = require('../db/supabase');
const { 
    calculateDeliveryFee, 
    calculateEstimatedDeliveryTime, 
    generateOrderNumber,
    generateRiderInfo,
    getStatusMessage 
} = require('../utils/helpers');

/**
 * Create a new order
 */
const createOrder = async (req, res) => {
    try {
        const { items, delivery_address, delivery_lat, delivery_lng, payment_method, notes } = req.body;
        const userId = req.user.id;

        // Get nearest outlet and calculate delivery fee
        const { data: nearestOutlet, error: outletError } = await supabase
            .rpc('get_nearest_outlet', {
                user_lat: delivery_lat,
                user_lng: delivery_lng
            })
            .single();

        if (outletError || !nearestOutlet) {
            return res.status(400).json({
                success: false,
                message: 'No outlets available in your area'
            });
        }

        const deliveryFee = calculateDeliveryFee(nearestOutlet.distance_km);
        const estimatedDeliveryTime = calculateEstimatedDeliveryTime(nearestOutlet.distance_km);

        // Calculate order total
        let totalAmount = 0;
        const orderItems = [];

        for (const item of items) {
            // Get product details
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('*')
                .eq('id', item.product_id)
                .eq('is_available', true)
                .single();

            if (productError || !product) {
                return res.status(400).json({
                    success: false,
                    message: `Product ${item.product_id} not found or unavailable`
                });
            }

            const subtotal = product.price_per_litre * item.quantity_litres;
            totalAmount += subtotal;

            orderItems.push({
                product_id: item.product_id,
                quantity_litres: item.quantity_litres,
                unit_price: product.price_per_litre,
                subtotal: subtotal
            });
        }

        totalAmount += deliveryFee;

        // Create order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([{
                user_id: userId,
                outlet_id: nearestOutlet.outlet_id,
                total_amount: totalAmount,
                delivery_fee: deliveryFee,
                payment_method: payment_method || 'cash',
                delivery_address: delivery_address,
                delivery_lat: delivery_lat,
                delivery_lng: delivery_lng,
                estimated_delivery_time: estimatedDeliveryTime,
                rider_info: generateRiderInfo(),
                notes: notes || null,
                status: 'pending'
            }])
            .select()
            .single();

        if (orderError) {
            console.error('Create order error:', orderError);
            return res.status(500).json({
                success: false,
                message: 'Failed to create order'
            });
        }

        // Create order items
        const orderItemsWithOrderId = orderItems.map(item => ({
            ...item,
            order_id: order.id
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItemsWithOrderId);

        if (itemsError) {
            console.error('Create order items error:', itemsError);
            // Rollback order creation
            await supabase.from('orders').delete().eq('id', order.id);
            
            return res.status(500).json({
                success: false,
                message: 'Failed to create order items'
            });
        }

        // Get complete order with items
        const { data: completeOrder, error: fetchError } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *,
                    products (*)
                ),
                outlets (name, address, phone)
            `)
            .eq('id', order.id)
            .single();

        if (fetchError) {
            console.error('Fetch complete order error:', fetchError);
        }

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: completeOrder || order
        });

    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Get user orders
 */
const getUserOrders = async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const userId = req.user.id;

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *,
                    products (name, image_url)
                ),
                outlets (name, address)
            `, { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (status) {
            query = query.eq('status', status);
        }

        const { data: orders, error, count } = await query;

        if (error) {
            console.error('Get user orders error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch orders'
            });
        }

        const totalPages = Math.ceil(count / limit);

        res.json({
            success: true,
            data: orders,
            pagination: {
                current_page: parseInt(page),
                total_pages: totalPages,
                total_items: count,
                items_per_page: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Get user orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Get order by ID
 */
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *,
                    products (*)
                ),
                outlets (*)
            `)
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (error || !order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            data: order
        });

    } catch (error) {
        console.error('Get order by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order'
        });
    }
};

/**
 * Get order status and tracking info
 */
const getOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                id,
                status,
                estimated_delivery_time,
                rider_info,
                created_at,
                outlets (name, address, phone)
            `)
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (error || !order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Calculate progress percentage based on status
        const statusProgress = {
            'pending': 10,
            'confirmed': 25,
            'preparing': 50,
            'out_for_delivery': 75,
            'delivered': 100,
            'cancelled': 0
        };

        const progress = statusProgress[order.status] || 0;
        const statusMessage = getStatusMessage(order.status);

        // Calculate estimated time remaining
        let timeRemaining = null;
        if (order.estimated_delivery_time && order.status !== 'delivered' && order.status !== 'cancelled') {
            const now = new Date();
            const estimatedTime = new Date(order.estimated_delivery_time);
            const diffMinutes = Math.max(0, Math.floor((estimatedTime - now) / (1000 * 60)));
            timeRemaining = `${diffMinutes} minutes`;
        }

        res.json({
            success: true,
            data: {
                order_id: order.id,
                status: order.status,
                status_message: statusMessage,
                progress_percentage: progress,
                estimated_delivery_time: order.estimated_delivery_time,
                time_remaining: timeRemaining,
                rider_info: order.rider_info,
                outlet: order.outlets,
                created_at: order.created_at
            }
        });

    } catch (error) {
        console.error('Get order status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order status'
        });
    }
};

/**
 * Cancel order (only if status is pending or confirmed)
 */
const cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if order exists and belongs to user
        const { data: order, error: fetchError } = await supabase
            .from('orders')
            .select('id, status')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (fetchError || !order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if order can be cancelled
        if (!['pending', 'confirmed'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: 'Order cannot be cancelled at this stage'
            });
        }

        // Update order status
        const { error: updateError } = await supabase
            .from('orders')
            .update({ 
                status: 'cancelled',
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (updateError) {
            console.error('Cancel order error:', updateError);
            return res.status(500).json({
                success: false,
                message: 'Failed to cancel order'
            });
        }

        res.json({
            success: true,
            message: 'Order cancelled successfully'
        });

    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Reorder - create new order based on previous order
 */
const reorder = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { delivery_address, delivery_lat, delivery_lng, payment_method } = req.body;

        // Get original order with items
        const { data: originalOrder, error: fetchError } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    product_id,
                    quantity_litres
                )
            `)
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (fetchError || !originalOrder) {
            return res.status(404).json({
                success: false,
                message: 'Original order not found'
            });
        }

        // Create new order with same items
        const newOrderData = {
            items: originalOrder.order_items.map(item => ({
                product_id: item.product_id,
                quantity_litres: item.quantity_litres
            })),
            delivery_address: delivery_address || originalOrder.delivery_address,
            delivery_lat: delivery_lat || originalOrder.delivery_lat,
            delivery_lng: delivery_lng || originalOrder.delivery_lng,
            payment_method: payment_method || originalOrder.payment_method
        };

        // Use the createOrder logic
        req.body = newOrderData;
        return createOrder(req, res);

    } catch (error) {
        console.error('Reorder error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reorder'
        });
    }
};

module.exports = {
    createOrder,
    getUserOrders,
    getOrderById,
    getOrderStatus,
    cancelOrder,
    reorder
};