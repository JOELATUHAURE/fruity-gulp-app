# Fruity Gulp Backend API

A complete backend API for the Fruity Gulp Juice mobile application, built with Node.js, Express, and Supabase.

## 🚀 Features

- **Authentication**: User registration, login, and profile management with Supabase Auth
- **Product Management**: Browse juices, search, filter by categories
- **AI Recommendations**: Get personalized juice recommendations based on symptoms and health goals
- **Order Management**: Create orders, track status, view history
- **Delivery System**: Calculate delivery fees, find nearest outlets, check availability
- **Real-time Tracking**: Order status updates with rider information
- **Security**: JWT authentication, rate limiting, input validation, CORS protection

## 🛠 Tech Stack

- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting
- **Utilities**: bcryptjs, jsonwebtoken, compression, morgan

## 📁 Project Structure

```
backend/
├── controllers/          # Business logic
│   ├── authController.js
│   ├── productController.js
│   ├── orderController.js
│   ├── deliveryController.js
│   └── recommendationController.js
├── routes/              # API routes
│   ├── auth.js
│   ├── products.js
│   ├── orders.js
│   ├── delivery.js
│   └── recommendations.js
├── middleware/          # Custom middleware
│   ├── auth.js
│   └── validation.js
├── models/             # Database models (future use)
├── db/                 # Database configuration
│   ├── supabase.js
│   └── schema.sql
├── utils/              # Helper functions
│   └── helpers.js
├── server.js           # Main server file
├── package.json
├── .env.example
└── README.md
```

## 🔧 Setup Instructions

### 1. Prerequisites

- Node.js 16 or higher
- npm or yarn
- Supabase account

### 2. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd backend

# Install dependencies
npm install
```

### 3. Supabase Setup

1. **Create a Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and API keys

2. **Set up the Database**:
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Copy and run the SQL from `db/schema.sql`
   - This will create all tables, functions, and sample data

3. **Configure Authentication**:
   - Go to Authentication > Settings
   - Disable email confirmation (for development)
   - Configure any additional auth providers if needed

### 4. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your Supabase credentials
```

Required environment variables:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_super_secret_jwt_key
PORT=3000
NODE_ENV=development
```

### 5. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### POST `/auth/signup`
Register a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+256700123456"
}
```

#### POST `/auth/login`
Login user.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### GET `/auth/profile`
Get user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <access_token>
```

### Product Endpoints

#### GET `/products`
Get all products with pagination and filtering.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `category`: Filter by category
- `search`: Search in name/description
- `sort`: Sort field (name, price, created_at)
- `order`: Sort order (asc, desc)

#### GET `/products/:id`
Get product by ID.

#### GET `/products/featured`
Get featured products.

#### GET `/products/search?q=mango`
Search products.

### Order Endpoints

#### POST `/orders`
Create a new order (requires authentication).

**Request Body:**
```json
{
  "items": [
    {
      "product_id": "uuid",
      "quantity_litres": 0.5
    }
  ],
  "delivery_address": {
    "street": "123 Main St",
    "city": "Kampala",
    "district": "Central"
  },
  "delivery_lat": 0.3476,
  "delivery_lng": 32.5825,
  "payment_method": "cash",
  "notes": "Optional notes"
}
```

#### GET `/orders`
Get user orders (requires authentication).

#### GET `/orders/:id/status`
Get order tracking status (requires authentication).

### Delivery Endpoints

#### GET `/delivery/fee?lat=0.3476&lng=32.5825`
Calculate delivery fee for location.

#### GET `/delivery/availability?lat=0.3476&lng=32.5825`
Check delivery availability.

#### GET `/delivery/outlets`
Get all outlets.

### Recommendation Endpoints

#### POST `/recommendations`
Get AI-powered juice recommendations.

**Request Body:**
```json
{
  "symptoms": ["flu", "fatigue"],
  "allergies": ["dairy"]
}
```

#### GET `/recommendations/symptoms`
Get available symptoms for recommendations.

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Joi schema validation
- **CORS Protection**: Configurable cross-origin requests
- **Helmet**: Security headers
- **SQL Injection Protection**: Parameterized queries via Supabase

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Test API health
curl http://localhost:3000/health
```

## 📱 Flutter Integration

The API is designed to work seamlessly with Flutter applications. Key integration points:

1. **Authentication**: Use the `/auth` endpoints for user management
2. **Product Catalog**: Connect to `/products` for the home screen
3. **AI Recommendations**: Use `/recommendations` for the AI recommendation feature
4. **Order Management**: Connect to `/orders` for cart and order tracking
5. **Delivery**: Use `/delivery` endpoints for fee calculation and outlet selection

### Sample Flutter HTTP Requests

```dart
// Login
final response = await http.post(
  Uri.parse('$baseUrl/api/auth/login'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({
    'email': email,
    'password': password,
  }),
);

// Get products
final response = await http.get(
  Uri.parse('$baseUrl/api/products'),
  headers: {'Authorization': 'Bearer $token'},
);

// Create order
final response = await http.post(
  Uri.parse('$baseUrl/api/orders'),
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer $token',
  },
  body: jsonEncode(orderData),
);
```

## 🚀 Deployment

### Environment Setup
1. Set `NODE_ENV=production`
2. Use strong JWT secrets
3. Configure proper CORS origins
4. Set up SSL/TLS certificates
5. Configure rate limiting for production load

### Recommended Hosting
- **Backend**: Railway, Render, or DigitalOcean
- **Database**: Supabase (managed)
- **CDN**: Cloudflare for static assets

## 🔄 Future Enhancements

- [ ] Push notifications for order updates
- [ ] Admin panel for managing products and orders
- [ ] Advanced AI recommendations with machine learning
- [ ] Subscription plans and loyalty programs
- [ ] Real-time order tracking with WebSockets
- [ ] Payment gateway integration (Stripe, Flutterwave)
- [ ] Analytics and reporting
- [ ] Multi-language support
- [ ] Inventory management
- [ ] Promotional codes and discounts

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check Supabase credentials in `.env`
   - Ensure Supabase project is active
   - Verify network connectivity

2. **Authentication Errors**
   - Check JWT secret configuration
   - Verify Supabase Auth settings
   - Ensure RLS policies are correctly set

3. **CORS Errors**
   - Update `ALLOWED_ORIGINS` in `.env`
   - Check frontend URL configuration

4. **Rate Limiting**
   - Adjust rate limit settings in `.env`
   - Implement proper error handling in frontend

### Logs and Debugging

```bash
# View logs in development
npm run dev

# Enable debug mode
DEBUG=* npm run dev
```

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review API documentation
3. Check Supabase dashboard for database issues
4. Create an issue in the repository

## 📄 License

This project is licensed under the MIT License.