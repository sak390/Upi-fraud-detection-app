const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Alert = require('../models/Alert');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get All Users (Admin only)
router.get('/', [
  auth,
  adminAuth,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('role').optional().isIn(['user', 'admin']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    
    if (req.query.role) {
      filter.role = req.query.role;
    }
    
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { upiId: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password -__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error while fetching users' });
  }
});

// Get User by ID (Admin only)
router.get('/:userId', [
  auth,
  adminAuth
], async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password -__v');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user statistics
    const stats = await Transaction.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          flaggedTransactions: {
            $sum: { $cond: ['$isFlagged', 1, 0] }
          }
        }
      }
    ]);

    const userStats = stats[0] || {
      totalTransactions: 0,
      totalAmount: 0,
      flaggedTransactions: 0
    };

    res.json({
      user: {
        ...user.toObject(),
        stats: userStats
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error while fetching user' });
  }
});

// Update User (Admin only)
router.put('/:userId', [
  auth,
  adminAuth,
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('role').optional().isIn(['user', 'admin']).withMessage('Invalid role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, role, isActive } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -__v');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error while updating user' });
  }
});

// Delete User (Admin only)
router.delete('/:userId', [
  auth,
  adminAuth
], async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has transactions
    const transactionCount = await Transaction.countDocuments({ userId: user._id });
    
    if (transactionCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete user with existing transactions. Deactivate user instead.' 
      });
    }

    await User.findByIdAndDelete(req.params.userId);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error while deleting user' });
  }
});

// Get Dashboard Statistics (Admin only)
router.get('/dashboard/stats', [
  auth,
  adminAuth
], async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalTransactions,
      flaggedTransactions,
      recentAlerts
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Transaction.countDocuments(),
      Transaction.countDocuments({ isFlagged: true }),
      Alert.countDocuments({ isRead: false })
    ]);

    // Get transaction trends for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const transactionTrends = await Transaction.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
          flagged: { $sum: { $cond: ['$isFlagged', 1, 0] } }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Get fraud distribution
    const fraudDistribution = await Transaction.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        totalTransactions,
        flaggedTransactions,
        unreadAlerts: recentAlerts
      },
      trends: {
        transactions: transactionTrends,
        fraudDistribution
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Server error while fetching dashboard statistics' });
  }
});

module.exports = router;
