from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables for model and preprocessing components
model = None
scaler = None
label_encoders = None

def load_model():
    """Lazy load model to prevent memory crashes"""
    global model, scaler, label_encoders
    
    try:
        # Only load if not already loaded
        if model is None:
            logger.info("Loading model components...")
            
            # Get base directory
            BASE_DIR = os.path.dirname(os.path.abspath(__file__))
            
            # Fix model paths
            model_path = os.getenv('MODEL_PATH', os.path.join(BASE_DIR, 'models', 'fraud_model.pkl'))
            scaler_path = os.getenv('SCALER_PATH', os.path.join(BASE_DIR, 'models', 'scaler.pkl'))
            encoders_path = os.path.join(BASE_DIR, 'models', 'label_encoders.pkl')
            
            # Check if files exist
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"Model file not found: {model_path}")
            if not os.path.exists(scaler_path):
                raise FileNotFoundError(f"Scaler file not found: {scaler_path}")
            if not os.path.exists(encoders_path):
                raise FileNotFoundError(f"Encoders file not found: {encoders_path}")
            
            # Load components
            model = joblib.load(model_path)
            scaler = joblib.load(scaler_path)
            label_encoders = joblib.load(encoders_path)
            
            logger.info("Model components loaded successfully")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        return False

def extract_features(transaction_data):
    """Extract features from transaction data for ML model"""
    
    # Parse timestamp
    timestamp = pd.to_datetime(transaction_data.get('timestamp', datetime.now()))
    
    # Extract time-based features
    hour_of_day = timestamp.hour
    day_of_week = timestamp.dayofweek
    is_weekend = 1 if day_of_week >= 5 else 0
    
    # For demo purposes, generate some realistic values for frequency-based features
    # In a real system, these would be calculated from historical data
    np.random.seed(hash(transaction_data.get('senderUpiId', '')) % 1000)
    
    # Simulate sender transaction frequency (transactions per day)
    sender_frequency = np.random.exponential(5)
    
    # Simulate receiver transaction frequency
    receiver_frequency = np.random.exponential(3)
    
    # Simulate location mismatch (1 if location is unusual for this user)
    location_mismatch = np.random.choice([0, 1], p=[0.9, 0.1])
    
    # Simulate device change (1 if device is new for this user)
    device_change = np.random.choice([0, 1], p=[0.85, 0.15])
    
    # Calculate amount deviation from user's average
    amount = float(transaction_data.get('amount', 0))
    amount_deviation = np.random.exponential(2)  # Deviation factor
    
    # Simulate time since last transaction (minutes)
    time_since_last = np.random.exponential(60)
    
    # Transaction type (default to p2p if not provided)
    transaction_type = transaction_data.get('transactionType', 'p2p')
    
    features = {
        'amount': amount,
        'hour_of_day': hour_of_day,
        'day_of_week': day_of_week,
        'sender_frequency': sender_frequency,
        'receiver_frequency': receiver_frequency,
        'location_mismatch': location_mismatch,
        'device_change': device_change,
        'amount_deviation': amount_deviation,
        'time_since_last': time_since_last,
        'is_weekend': is_weekend,
        'transaction_type': transaction_type
    }
    
    return features

def preprocess_transaction(features):
    """Preprocess transaction features for prediction"""
    
    # Convert to DataFrame
    df = pd.DataFrame([features])
    
    # Encode categorical variables
    df['transaction_type_encoded'] = label_encoders['transaction_type'].transform(df['transaction_type'])
    
    # Select features in the correct order
    feature_columns = [
        'amount', 'hour_of_day', 'day_of_week', 'sender_frequency',
        'receiver_frequency', 'location_mismatch', 'device_change',
        'amount_deviation', 'time_since_last', 'is_weekend',
        'transaction_type_encoded'
    ]
    
    X = df[feature_columns]
    
    # Scale features
    X_scaled = scaler.transform(X)
    
    return X_scaled

def determine_risk_factors(features, fraud_score):
    """Determine risk factors based on features and fraud score"""
    
    risk_factors = []
    
    if features['amount'] > 50000:
        risk_factors.append('high_amount')
    
    if features['hour_of_day'] < 6 or features['hour_of_day'] > 22:
        risk_factors.append('unusual_time')
    
    if features['location_mismatch'] == 1:
        risk_factors.append('location_mismatch')
    
    if features['device_change'] == 1:
        risk_factors.append('new_device')
    
    if features['amount_deviation'] > 5:
        risk_factors.append('amount_anomaly')
    
    if features['time_since_last'] < 5:
        risk_factors.append('high_frequency')
    
    if features['is_weekend'] == 1 and features['amount'] > 20000:
        risk_factors.append('weekend_high_value')
    
    return risk_factors

@app.route('/')
def home():
    """Root endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'UPI Fraud Detection ML API',
        'version': '1.0.0',
        'endpoints': {
            'health': '/api/health',
            'fraud_check': '/api/fraud/check',
            'batch_check': '/api/fraud/batch-check',
            'model_info': '/api/model/info'
        }
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Check if model is loaded
        model_status = model is not None
        
        return jsonify({
            'status': 'healthy',
            'message': 'UPI Fraud Detection ML API is running',
            'model_loaded': model_status,
            'timestamp': datetime.now().isoformat(),
            'memory_usage': 'low'  # For Railway monitoring
        })
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/fraud/check', methods=['POST'])
def check_fraud():
    """Check transaction for fraud"""
    
    try:
        # Lazy load model
        if not load_model():
            return jsonify({
                'error': 'Model not available',
                'message': 'ML model failed to load'
            }), 503
        
        # Validate input data
        required_fields = ['senderUpiId', 'receiverUpiId', 'amount', 'deviceId']
        
        for field in required_fields:
            if field not in request.json:
                return jsonify({
                    'error': f'Missing required field: {field}'
                }), 400
        
        transaction_data = request.json
        
        # Extract features
        features = extract_features(transaction_data)
        
        # Preprocess features
        X_scaled = preprocess_transaction(features)
        
        # Make prediction
        fraud_probability = model.predict_proba(X_scaled)[0, 1]
        fraud_score = round(fraud_probability * 100, 2)
        
        # Determine status
        if fraud_score >= 70:
            status = 'fraud'
        elif fraud_score >= 40:
            status = 'suspicious'
        else:
            status = 'safe'
        
        # Determine risk factors
        risk_factors = determine_risk_factors(features, fraud_score)
        
        # Log the prediction
        logger.info(f"Fraud check completed - Score: {fraud_score}%, Status: {status}")
        
        return jsonify({
            'fraudScore': fraud_score,
            'status': status,
            'riskFactors': risk_factors,
            'features': features,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error during fraud check: {e}")
        return jsonify({
            'error': 'Internal server error',
            'message': f'Failed to process fraud check: {str(e)}'
        }), 500

@app.route('/api/fraud/batch-check', methods=['POST'])
def batch_check_fraud():
    """Check multiple transactions for fraud"""
    
    try:
        # Lazy load model
        if not load_model():
            return jsonify({
                'error': 'Model not available',
                'message': 'ML model failed to load'
            }), 503
        
        transactions = request.json.get('transactions', [])
        
        if not transactions:
            return jsonify({
                'error': 'No transactions provided'
            }), 400
        
        results = []
        
        for transaction_data in transactions:
            try:
                # Extract features
                features = extract_features(transaction_data)
                
                # Preprocess features
                X_scaled = preprocess_transaction(features)
                
                # Make prediction
                fraud_probability = model.predict_proba(X_scaled)[0, 1]
                fraud_score = round(fraud_probability * 100, 2)
                
                # Determine status
                if fraud_score >= 70:
                    status = 'fraud'
                elif fraud_score >= 40:
                    status = 'suspicious'
                else:
                    status = 'safe'
                
                # Determine risk factors
                risk_factors = determine_risk_factors(features, fraud_score)
                
                results.append({
                    'transactionId': transaction_data.get('transactionId'),
                    'fraudScore': fraud_score,
                    'status': status,
                    'riskFactors': risk_factors
                })
                
            except Exception as e:
                logger.error(f"Error processing transaction: {e}")
                results.append({
                    'transactionId': transaction_data.get('transactionId'),
                    'error': f'Failed to process transaction: {str(e)}'
                })
        
        return jsonify({
            'results': results,
            'processedAt': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error during batch fraud check: {e}")
        return jsonify({
            'error': 'Internal server error',
            'message': f'Failed to process batch fraud check: {str(e)}'
        }), 500

@app.route('/api/model/info', methods=['GET'])
def model_info():
    """Get information about the loaded model"""
    
    try:
        # Lazy load model
        if not load_model():
            return jsonify({
                'error': 'Model not available',
                'message': 'ML model failed to load'
            }), 503
        
        feature_names = [
            'amount', 'hour_of_day', 'day_of_week', 'sender_frequency',
            'receiver_frequency', 'location_mismatch', 'device_change',
            'amount_deviation', 'time_since_last', 'is_weekend',
            'transaction_type_encoded'
        ]
        
        feature_importance = pd.DataFrame({
            'feature': feature_names,
            'importance': model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        return jsonify({
            'modelType': 'RandomForestClassifier',
            'features': feature_names,
            'featureImportance': feature_importance.to_dict('records'),
            'nFeatures': len(feature_names),
            'modelLoaded': True
        })
        
    except Exception as e:
        logger.error(f"Error getting model info: {e}")
        return jsonify({
            'error': 'Failed to get model information',
            'message': f'Error: {str(e)}'
        }), 500
 


if __name__ == '__main__':
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Start server without loading model (lazy loading)
    logger.info("Starting ML API server...")
    port = int(os.getenv('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=False)
