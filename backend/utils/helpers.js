/**
 * Utility helper functions
 */

/**
 * Calculate delivery fee based on distance
 * Base fee: UGX 2000, Additional: UGX 2000 per km
 */
const calculateDeliveryFee = (distanceKm) => {
    const baseFee = 2000;
    const perKmFee = 2000;
    return baseFee + (perKmFee * Math.ceil(distanceKm));
};

/**
 * Calculate estimated delivery time based on distance
 * Base time: 30 minutes, Additional: 10 minutes per km
 */
const calculateEstimatedDeliveryTime = (distanceKm) => {
    const baseTimeMinutes = 30;
    const perKmMinutes = 10;
    const totalMinutes = baseTimeMinutes + (perKmMinutes * distanceKm);
    
    const deliveryTime = new Date();
    deliveryTime.setMinutes(deliveryTime.getMinutes() + totalMinutes);
    
    return deliveryTime;
};

/**
 * Format currency to UGX
 */
const formatCurrency = (amount) => {
    return `UGX ${amount.toLocaleString()}`;
};

/**
 * Generate order number
 */
const generateOrderNumber = () => {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `FG${timestamp.slice(-6)}${random}`;
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
};

/**
 * Sanitize user input
 */
const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
};

/**
 * Generate random rider info for demo purposes
 */
const generateRiderInfo = () => {
    const riders = [
        { name: 'Kato', phone: '+256700123456', rating: 4.8 },
        { name: 'Nakato', phone: '+256700123457', rating: 4.9 },
        { name: 'Ssemakula', phone: '+256700123458', rating: 4.7 },
        { name: 'Namukasa', phone: '+256700123459', rating: 4.6 },
        { name: 'Mukasa', phone: '+256700123460', rating: 4.8 }
    ];
    
    return riders[Math.floor(Math.random() * riders.length)];
};

/**
 * Get status message for order tracking
 */
const getStatusMessage = (status) => {
    const messages = {
        'pending': 'Order received and being processed',
        'confirmed': 'Order confirmed and being prepared',
        'preparing': 'Your fresh juices are being prepared',
        'out_for_delivery': 'Order is on the way to you',
        'delivered': 'Order has been delivered successfully',
        'cancelled': 'Order has been cancelled'
    };
    
    return messages[status] || 'Order status unknown';
};

/**
 * Validate coordinates
 */
const isValidCoordinate = (lat, lng) => {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

module.exports = {
    calculateDeliveryFee,
    calculateEstimatedDeliveryTime,
    formatCurrency,
    generateOrderNumber,
    calculateDistance,
    sanitizeInput,
    generateRiderInfo,
    getStatusMessage,
    isValidCoordinate
};