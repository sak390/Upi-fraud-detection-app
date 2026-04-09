const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  senderUpiId: {
    type: String,
    required: [true, 'Sender UPI ID is required'],
    trim: true
  },
  receiverUpiId: {
    type: String,
    required: [true, 'Receiver UPI ID is required'],
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  deviceId: {
    type: String,
    required: [true, 'Device ID is required'],
    trim: true
  },
  location: {
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    }
  },
  fraudScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  status: {
    type: String,
    enum: ['safe', 'suspicious', 'fraud'],
    default: 'safe'
  },
  isFlagged: {
    type: Boolean,
    default: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    transactionType: {
      type: String,
      enum: ['p2p', 'p2m', 'bill_payment'],
      default: 'p2p'
    },
    description: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ senderUpiId: 1 });
transactionSchema.index({ receiverUpiId: 1 });
transactionSchema.index({ userId: 1 });
transactionSchema.index({ timestamp: -1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ fraudScore: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
