# UPI Fraud Detection API Documentation

## Base URL

- Backend API: `http://localhost:5000`
- ML API: `http://localhost:8000`

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "Error message",
  "message": "Detailed error description"
}
```

## Authentication Endpoints

### Register User
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "upiId": "john@bank",
  "phoneNumber": "9876543210"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "upiId": "john@bank",
    "role": "user"
  }
}
```

### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "upiId": "john@bank",
    "role": "user"
  }
}
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "upiId": "john@bank",
    "phoneNumber": "9876543210",
    "role": "user",
    "lastLogin": "2024-01-15T10:30:00.000Z"
  }
}
```

### Change Password
```http
PUT /api/auth/change-password
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

## Transaction Endpoints

### Add Transaction
```http
POST /api/transactions/add
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "senderUpiId": "sender@bank",
  "receiverUpiId": "receiver@bank",
  "amount": 5000,
  "deviceId": "device123",
  "location": {
    "latitude": 19.0760,
    "longitude": 72.8777,
    "city": "Mumbai",
    "state": "Maharashtra"
  },
  "transactionType": "p2p"
}
```

**Response:**
```json
{
  "message": "Transaction added successfully",
  "transaction": {
    "transactionId": "TXN123456789",
    "senderUpiId": "sender@bank",
    "receiverUpiId": "receiver@bank",
    "amount": 5000,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "fraudScore": 15.5,
    "status": "safe",
    "isFlagged": false
  }
}
```

### Get User Transactions
```http
GET /api/transactions?page=1&limit=10&status=safe&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number for pagination
- `limit` (optional): Number of transactions per page
- `status` (optional): Filter by status (safe, suspicious, fraud)
- `startDate` (optional): Filter by start date (ISO format)
- `endDate` (optional): Filter by end date (ISO format)

**Response:**
```json
{
  "transactions": [
    {
      "_id": "transaction_id",
      "transactionId": "TXN123456789",
      "senderUpiId": "sender@bank",
      "receiverUpiId": "receiver@bank",
      "amount": 5000,
      "timestamp": "2024-01-15T10:30:00.000Z",
      "fraudScore": 15.5,
      "status": "safe",
      "isFlagged": false,
      "location": {
        "latitude": 19.0760,
        "longitude": 72.8777,
        "city": "Mumbai",
        "state": "Maharashtra"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### Get All Transactions (Admin)
```http
GET /api/transactions/all?page=1&limit=20&status=suspicious
Authorization: Bearer <admin_token>
```

### Get Transaction Statistics
```http
GET /api/transactions/stats/summary
Authorization: Bearer <token>
```

**Response:**
```json
{
  "stats": {
    "totalTransactions": 150,
    "totalAmount": 2500000,
    "safeTransactions": 120,
    "suspiciousTransactions": 25,
    "fraudTransactions": 5,
    "averageAmount": 16666.67,
    "maxAmount": 200000
  }
}
```

## Alert Endpoints

### Get User Alerts
```http
GET /api/alerts?page=1&limit=10&severity=high&isRead=false
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Number of alerts per page
- `severity` (optional): Filter by severity (low, medium, high, critical)
- `isRead` (optional): Filter by read status (true/false)
- `alertType` (optional): Filter by alert type

**Response:**
```json
{
  "alerts": [
    {
      "_id": "alert_id",
      "transactionId": "TXN123456789",
      "alertType": "high_amount",
      "severity": "high",
      "message": "High amount transaction detected: ₹75000",
      "isRead": false,
      "isResolved": false,
      "metadata": {
        "fraudScore": 85.5,
        "riskFactors": ["high_amount", "unusual_time"],
        "recommendedAction": "Review transaction immediately"
      },
      "createdAt": "2024-01-15T10:35:00.000Z"
    }
  ],
  "unreadCount": 5,
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "pages": 2
  }
}
```

### Mark Alert as Read
```http
PUT /api/alerts/:alertId/read
Authorization: Bearer <token>
```

### Mark Multiple Alerts as Read
```http
PUT /api/alerts/mark-read
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "alertIds": ["alert_id_1", "alert_id_2", "alert_id_3"]
}
```

### Resolve Alert (Admin)
```http
PUT /api/alerts/:alertId/resolve
Authorization: Bearer <admin_token>
```

## User Management Endpoints (Admin Only)

### Get All Users
```http
GET /api/users?page=1&limit=20&role=user&search=john
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Number of users per page
- `role` (optional): Filter by role (user, admin)
- `search` (optional): Search by name, email, or UPI ID

### Update User
```http
PUT /api/users/:userId
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "name": "John Doe",
  "role": "admin",
  "isActive": true
}
```

## ML API Endpoints

### Check Transaction Fraud
```http
POST /api/fraud/check
```

**Request Body:**
```json
{
  "senderUpiId": "sender@bank",
  "receiverUpiId": "receiver@bank",
  "amount": 5000,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "deviceId": "device123",
  "location": {
    "latitude": 19.0760,
    "longitude": 72.8777,
    "city": "Mumbai",
    "state": "Maharashtra"
  },
  "transactionType": "p2p"
}
```

**Response:**
```json
{
  "fraudScore": 15.5,
  "status": "safe",
  "riskFactors": [],
  "features": {
    "amount": 5000,
    "hour_of_day": 10,
    "day_of_week": 1,
    "sender_frequency": 3.2,
    "receiver_frequency": 1.8,
    "location_mismatch": 0,
    "device_change": 0,
    "amount_deviation": 1.2,
    "time_since_last": 45.5,
    "is_weekend": 0,
    "transaction_type": "p2p"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Batch Fraud Check
```http
POST /api/fraud/batch-check
```

**Request Body:**
```json
{
  "transactions": [
    {
      "transactionId": "TXN1",
      "senderUpiId": "sender@bank",
      "receiverUpiId": "receiver@bank",
      "amount": 5000,
      "deviceId": "device123"
    }
  ]
}
```

### Get Model Information
```http
GET /api/model/info
```

**Response:**
```json
{
  "modelType": "RandomForestClassifier",
  "features": [
    "amount",
    "hour_of_day",
    "day_of_week",
    "sender_frequency",
    "receiver_frequency",
    "location_mismatch",
    "device_change",
    "amount_deviation",
    "time_since_last",
    "is_weekend",
    "transaction_type_encoded"
  ],
  "featureImportance": [
    {
      "feature": "amount",
      "importance": 0.25
    }
  ],
  "nFeatures": 11,
  "modelLoaded": true
}
```

## Error Codes

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid or missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error
- `503` - Service Unavailable (ML model not loaded)

## Rate Limiting

API endpoints are rate-limited to 100 requests per 15 minutes per IP address.

## Webhooks

Future versions may support webhooks for real-time fraud alerts.
