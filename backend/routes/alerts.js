const express = require('express');
const { query, param } = require('express-validator');
const Alert = require('../models/Alert');
const { auth, adminAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Get User Alerts
router.get('/', [
  auth,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity'),
  query('isRead').optional().isBoolean().withMessage('isRead must be a boolean'),
  query('alertType').optional().isIn(['high_amount', 'unusual_location', 'frequency_spike', 'new_recipient', 'suspicious_pattern']).withMessage('Invalid alert type')
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
    
    if (req.query.severity) {
      filter.severity = req.query.severity;
    }
    
    if (req.query.isRead !== undefined) {
      filter.isRead = req.query.isRead === 'true';
    }
    
    if (req.query.alertType) {
      filter.alertType = req.query.alertType;
    }

    const alerts = await Alert.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v');

    const total = await Alert.countDocuments(filter);

    // Get unread count
    const unreadCount = await Alert.countDocuments({
      userId: req.user._id,
      isRead: false
    });

    res.json({
      alerts,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Server error while fetching alerts' });
  }
});

// Get All Alerts (Admin only)
router.get('/all', [
  auth,
  adminAuth,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  query('isRead').optional().isBoolean(),
  query('alertType').optional().isIn(['high_amount', 'unusual_location', 'frequency_spike', 'new_recipient', 'suspicious_pattern'])
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    
    if (req.query.severity) {
      filter.severity = req.query.severity;
    }
    
    if (req.query.isRead !== undefined) {
      filter.isRead = req.query.isRead === 'true';
    }
    
    if (req.query.alertType) {
      filter.alertType = req.query.alertType;
    }

    const alerts = await Alert.find(filter)
      .populate('userId', 'name email upiId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v');

    const total = await Alert.countDocuments(filter);

    res.json({
      alerts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all alerts error:', error);
    res.status(500).json({ error: 'Server error while fetching alerts' });
  }
});

// Mark Alert as Read
router.put('/:alertId/read', [
  auth,
  param('alertId').isMongoId().withMessage('Invalid alert ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const alert = await Alert.findOneAndUpdate(
      { 
        _id: req.params.alertId,
        userId: req.user._id 
      },
      { isRead: true },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({
      message: 'Alert marked as read',
      alert
    });
  } catch (error) {
    console.error('Mark alert as read error:', error);
    res.status(500).json({ error: 'Server error while updating alert' });
  }
});

// Mark Multiple Alerts as Read
router.put('/mark-read', [
  auth,
  body('alertIds').isArray().withMessage('alertIds must be an array'),
  body('alertIds.*').isMongoId().withMessage('Invalid alert ID in array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { alertIds } = req.body;

    const result = await Alert.updateMany(
      { 
        _id: { $in: alertIds },
        userId: req.user._id 
      },
      { isRead: true }
    );

    res.json({
      message: `${result.modifiedCount} alerts marked as read`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark alerts as read error:', error);
    res.status(500).json({ error: 'Server error while updating alerts' });
  }
});

// Resolve Alert (Admin only)
router.put('/:alertId/resolve', [
  auth,
  adminAuth,
  param('alertId').isMongoId().withMessage('Invalid alert ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const alert = await Alert.findByIdAndUpdate(
      req.params.alertId,
      { 
        isResolved: true,
        resolvedBy: req.user._id,
        resolvedAt: new Date()
      },
      { new: true }
    ).populate('userId', 'name email');

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({
      message: 'Alert resolved successfully',
      alert
    });
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({ error: 'Server error while resolving alert' });
  }
});

// Delete Alert
router.delete('/:alertId', [
  auth,
  param('alertId').isMongoId().withMessage('Invalid alert ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const alert = await Alert.findOneAndDelete({
      _id: req.params.alertId,
      userId: req.user._id
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ message: 'Alert deleted successfully' });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({ error: 'Server error while deleting alert' });
  }
});

// Get Alert Statistics
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const stats = await Alert.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          totalAlerts: { $sum: 1 },
          unreadAlerts: {
            $sum: { $cond: ['$isRead', 0, 1] }
          },
          resolvedAlerts: {
            $sum: { $cond: ['$isResolved', 1, 0] }
          },
          criticalAlerts: {
            $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
          },
          highAlerts: {
            $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalAlerts: 0,
      unreadAlerts: 0,
      resolvedAlerts: 0,
      criticalAlerts: 0,
      highAlerts: 0
    };

    res.json({ stats: result });
  } catch (error) {
    console.error('Get alert stats error:', error);
    res.status(500).json({ error: 'Server error while fetching alert statistics' });
  }
});

module.exports = router;
