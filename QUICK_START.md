# 🚀 UPI Fraud Detection System - Quick Start Guide

## 📋 Prerequisites
- Node.js (v14 or higher)
- MongoDB (installed and running)
- Python 3.8+ (for ML API)

## 🛠️ Installation Steps

### 1. Frontend Setup
```bash
cd frontend
npm install
npm start
```
**Frontend will run on:** http://localhost:3000

### 2. Backend Setup
```bash
cd backend
npm install
```

### 3. Environment Configuration
The `.env` file is already created with default values. You can modify if needed:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/upi_fraud_detection
JWT_SECRET=super_secret_jwt_key_for_development_only
JWT_EXPIRE=7d
ML_API_URL=http://localhost:8000
```

### 4. Database Setup
```bash
cd backend
node setup.js
```
This creates default users:
- **Admin:** admin@example.com / admin123
- **User:** user@example.com / user123

### 5. Start Backend Server
```bash
cd backend
npm start
```
**Backend will run on:** http://localhost:5000

### 6. ML API Setup (Optional)
```bash
cd ml-api
pip install -r requirements.txt
python app.py
```
**ML API will run on:** http://localhost:8000

## 🔐 Login Credentials

### Using Mock Authentication (No Backend Required)
- **Admin:** admin@example.com / password
- **User:** user@example.com / password

### Using Real Backend
- **Admin:** admin@example.com / admin123
- **User:** user@example.com / user123

## 🎨 Modern UI Features

The frontend includes:
- ✨ Glass morphism effects
- 🎯 Gradient buttons and cards
- 🌈 Beautiful animations and transitions
- 📱 Fully responsive design
- ⚡ Smooth micro-interactions
- 🔒 Security-focused visual elements

## 🧪 Testing

### Frontend Testing
1. Open http://localhost:3000
2. Try login with mock credentials
3. Navigate through dashboard
4. Test all UI components

### Backend Testing
1. Ensure MongoDB is running
2. Start backend server
3. Test API endpoints with Postman/Insomnia

## 📁 Project Structure

```
detect/
├── frontend/          # React frontend with modern UI
├── backend/           # Node.js/Express API
├── ml-api/           # Python ML API
├── data/             # Sample data
└── docs/             # Documentation
```

## 🐛 Troubleshooting

### Frontend Issues
- **CORS errors:** Ensure backend is running
- **Module not found:** Run `npm install` in frontend folder
- **Port in use:** Change port in package.json or kill process

### Backend Issues
- **MongoDB connection:** Check if MongoDB is running
- **Module not found:** Run `npm install` in backend folder
- **JWT errors:** Check JWT_SECRET in .env file

### ML API Issues
- **Python dependencies:** Install requirements.txt
- **Model not found:** Run train_model.py first

## 🚀 Production Deployment

1. Set `NODE_ENV=production` in backend .env
2. Configure production database
3. Set up reverse proxy (nginx)
4. Configure SSL certificates
5. Set up monitoring and logging

## 📞 Support

For issues:
1. Check console logs
2. Verify all services are running
3. Check network connectivity
4. Review environment variables

---

**🎉 Your UPI Fraud Detection System is ready!**
