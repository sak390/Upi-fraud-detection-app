const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  alertType: {
    type: String,
    enum: ['high_amount', 'unusual_location', 'frequency_spike', 'new_recipient', 'suspicious_pattern'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isResolved: {
    type: Boolean,
    default: false
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: {
    type: Date
  },
  metadata: {
    fraudScore: Number,
    riskFactors: [String],
    recommendedAction: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
alertSchema.index({ userId: 1 });
alertSchema.index({ transactionId: 1 });
alertSchema.index({ isRead: 1 });
alertSchema.index({ severity: 1 });
alertSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
