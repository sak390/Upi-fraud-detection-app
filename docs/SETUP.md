# UPI Fraud Detection System - Setup Guide

## Prerequisites

- Node.js (v16 or higher)
- Python (v3.8 or higher)
- MongoDB (v5.0 or higher)
- Git

## Project Structure

```
detect/
├── backend/          # Node.js/Express API server
├── frontend/         # React.js web application
├── ml-api/          # Python Flask ML inference API
├── data/            # Sample datasets
└── docs/            # Documentation
```

## Setup Instructions

### 1. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/upi_fraud_detection
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d
ML_API_URL=http://localhost:8000
```

Start the backend server:
```bash
npm run dev
```

### 2. ML API Setup

```bash
cd ml-api
pip install -r requirements.txt
```

Create `.env` file:
```env
FLASK_APP=app.py
FLASK_ENV=development
PORT=8000
MODEL_PATH=models/fraud_model.pkl
SCALER_PATH=models/scaler.pkl
```

Train the ML model:
```bash
python train_model.py
```

Start the ML API server:
```bash
python app.py
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create `.env` file:
```env
REACT_APP_API_URL=http://localhost:5000
```

Start the frontend development server:
```bash
npm start
```

### 4. Database Setup

Make sure MongoDB is running on your system:
```bash
# For Windows
net start MongoDB

# For macOS/Linux
sudo systemctl start mongod
```

## Default Admin Account

After setting up, you can create an admin account by registering with any email and then manually updating the role in MongoDB:

```javascript
// In MongoDB shell
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - User login
- GET `/api/auth/me` - Get current user
- PUT `/api/auth/change-password` - Change password

### Transactions
- POST `/api/transactions/add` - Add transaction
- GET `/api/transactions` - Get user transactions
- GET `/api/transactions/all` - Get all transactions (admin)
- GET `/api/transactions/stats/summary` - Get transaction stats

### Alerts
- GET `/api/alerts` - Get user alerts
- GET `/api/alerts/all` - Get all alerts (admin)
- PUT `/api/alerts/:id/read` - Mark alert as read
- PUT `/api/alerts/:id/resolve` - Resolve alert (admin)

### Users (Admin)
- GET `/api/users` - Get all users
- GET `/api/users/:id` - Get user details
- PUT `/api/users/:id` - Update user
- DELETE `/api/users/:id` - Delete user

### ML API
- POST `/api/fraud/check` - Check transaction fraud
- GET `/api/health` - Health check

## Features

### User Features
- User registration and login
- Add/view transactions
- Real-time fraud detection
- View fraud alerts
- Profile management

### Admin Features
- View all transactions
- Manage users
- View all alerts
- Dashboard analytics
- Resolve alerts

### ML Features
- Real-time fraud detection
- Risk scoring (0-100%)
- Multiple risk factors analysis
- Pattern recognition

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation
- Rate limiting
- CORS protection
- SQL injection prevention

## Deployment

### Backend (Render/Heroku)
1. Set environment variables
2. Connect to MongoDB Atlas
3. Deploy the Node.js application

### Frontend (Vercel/Netlify)
1. Set REACT_APP_API_URL environment variable
2. Build and deploy the React application

### ML API (Render/PythonAnywhere)
1. Install dependencies
2. Upload trained model files
3. Deploy Flask application

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in .env file

2. **ML API Not Responding**
   - Make sure the model is trained
   - Check if Flask server is running on port 8000

3. **Frontend API Errors**
   - Verify backend is running on port 5000
   - Check CORS configuration

4. **Authentication Issues**
   - Verify JWT_SECRET is set
   - Check token expiration

### Logs

- Backend logs: Check console output
- ML API logs: Check Flask console
- Frontend logs: Check browser developer tools

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review API documentation
3. Check logs for error messages
4. Verify all services are running
