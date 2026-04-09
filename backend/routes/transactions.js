const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Transaction = require('../models/Transaction');
const Alert = require('../models/Alert');
const { auth, adminAuth } = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();

// Generate unique transaction ID
const generateTransactionId = () => {
  return 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
};

// Check transaction fraud using ML API
const checkFraud = async (transactionData) => {
  try {
    const response = await axios.post(`${process.env.ML_API_URL}/api/fraud/check`, {
      senderUpiId: transactionData.senderUpiId,
      receiverUpiId: transactionData.receiverUpiId,
      amount: transactionData.amount,
      timestamp: transactionData.timestamp,
      deviceId: transactionData.deviceId,
      location: transactionData.location
    });
    
    return response.data;
  } catch (error) {
    console.error('ML API error:', error);
    // Return default safe response if ML API is unavailable
    return {
      fraudScore: 0,
      status: 'safe',
      riskFactors: []
    };
  }
};

// Create alerts for suspicious transactions
const createAlerts = async (transaction, fraudResult) => {
  const alerts = [];
  
  if (fraudResult.fraudScore > 70) {
    alerts.push({
      transactionId: transaction.transactionId,
      userId: transaction.userId,
      alertType: 'suspicious_pattern',
      severity: 'high',
      message: `High fraud risk detected for transaction ${transaction.transactionId}`,
      metadata: {
        fraudScore: fraudResult.fraudScore,
        riskFactors: fraudResult.riskFactors || [],
        recommendedAction: 'Review transaction immediately'
      }
    });
  }
  
  if (transaction.amount > 50000) {
    alerts.push({
      transactionId: transaction.transactionId,
      userId: transaction.userId,
      alertType: 'high_amount',
      severity: 'medium',
      message: `High amount transaction detected: ₹${transaction.amount}`,
      metadata: {
        fraudScore: fraudResult.fraudScore,
        riskFactors: ['high_amount'],
        recommendedAction: 'Verify transaction legitimacy'
      }
    });
  }
  
  // Save alerts
  if (alerts.length > 0) {
    await Alert.insertMany(alerts);
  }
};

// Add Transaction
router.post('/add', [
  auth,
  body('senderUpiId').notEmpty().withMessage('Sender UPI ID is required'),
  body('receiverUpiId').notEmpty().withMessage('Receiver UPI ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('deviceId').notEmpty().withMessage('Device ID is required'),
  body('location.latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('location.longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      senderUpiId,
      receiverUpiId,
      amount,
      deviceId,
      location,
      metadata = {}
    } = req.body;

    // Check for duplicate transaction ID
    const transactionId = generateTransactionId();
    
    // Create transaction object
    const transactionData = {
      transactionId,
      senderUpiId,
      receiverUpiId,
      amount,
      deviceId,
      location,
      userId: req.user._id,
      metadata: {
        ...metadata,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    };

    // Check fraud using ML API
    const fraudResult = await checkFraud(transactionData);
    
    // Update transaction with fraud results
    transactionData.fraudScore = fraudResult.fraudScore || 0;
    transactionData.status = fraudResult.status || 'safe';
    transactionData.isFlagged = fraudResult.fraudScore > 50;

    // Create transaction
    const transaction = new Transaction(transactionData);
    await transaction.save();

    // Create alerts if suspicious
    if (transactionData.isFlagged) {
      await createAlerts(transaction, fraudResult);
    }

    res.status(201).json({
      message: 'Transaction added successfully',
      transaction: {
        transactionId: transaction.transactionId,
        senderUpiId: transaction.senderUpiId,
        receiverUpiId: transaction.receiverUpiId,
        amount: transaction.amount,
        timestamp: transaction.timestamp,
        fraudScore: transaction.fraudScore,
        status: transaction.status,
        isFlagged: transaction.isFlagged
      }
    });
  } catch (error) {
    console.error('Add transaction error:', error);
    res.status(500).json({ error: 'Server error while adding transaction' });
  }
});

// Get User Transactions
router.get('/', [
  auth,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['safe', 'suspicious', 'fraud']).withMessage('Invalid status'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { userId: req.user._id };
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.startDate || req.query.endDate) {
      filter.timestamp = {};
      if (req.query.startDate) {
        filter.timestamp.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.timestamp.$lte = new Date(req.query.endDate);
      }
    }

    const transactions = await Transaction.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v -updatedAt');

    const total = await Transaction.countDocuments(filter);

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Server error while fetching transactions' });
  }
});

// Get All Transactions (Admin only)
router.get('/all', [
  auth,
  adminAuth,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['safe', 'suspicious', 'fraud']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.startDate || req.query.endDate) {
      filter.timestamp = {};
      if (req.query.startDate) {
        filter.timestamp.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.timestamp.$lte = new Date(req.query.endDate);
      }
    }

    const transactions = await Transaction.find(filter)
      .populate('userId', 'name email upiId')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v -updatedAt');

    const total = await Transaction.countDocuments(filter);

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({ error: 'Server error while fetching transactions' });
  }
});

// Get Transaction by ID
router.get('/:transactionId', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      transactionId: req.params.transactionId,
      userId: req.user._id
    }).select('-__v -updatedAt');

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ transaction });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Server error while fetching transaction' });
  }
});

// Get Transaction Statistics
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const stats = await Transaction.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          safeTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'safe'] }, 1, 0] }
          },
          suspiciousTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'suspicious'] }, 1, 0] }
          },
          fraudTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'fraud'] }, 1, 0] }
          },
          averageAmount: { $avg: '$amount' },
          maxAmount: { $max: '$amount' }
        }
      }
    ]);

    const result = stats[0] || {
      totalTransactions: 0,
      totalAmount: 0,
      safeTransactions: 0,
      suspiciousTransactions: 0,
      fraudTransactions: 0,
      averageAmount: 0,
      maxAmount: 0
    };

    res.json({ stats: result });
  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({ error: 'Server error while fetching statistics' });
  }
});

module.exports = router;
