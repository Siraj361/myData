const db = require('../models');
const asyncHandler = require('express-async-handler');
const Payment = db.Payment;

// ✅ Create Payment
const createPayment = asyncHandler(async (req, res) => {
  try {
    const payment = await Payment.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating payment',
      error: error.message,
    });
  }
});

// ✅ Update Payment
const updatePayment = asyncHandler(async (req, res) => {
  try {
    const id = req.params.id;
    const [updated] = await Payment.update(req.body, { where: { id } });

    if (updated === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found or nothing updated',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating payment',
      error: error.message,
    });
  }
});

// ✅ Get Single Payment
const getPayment = asyncHandler(async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }
    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving payment',
      error: error.message,
    });
  }
});

// ✅ Delete Payment
const deletePayment = asyncHandler(async (req, res) => {
  try {
    const deleted = await Payment.destroy({ where: { id: req.params.id } });

    if (deleted === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting payment',
      error: error.message,
    });
  }
});

// ✅ Get All Payments
const getAllPayments = asyncHandler(async (req, res) => {
  try {
    const payments = await Payment.findAll();
    if (!payments || payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No payments found',
      });
    }

    res.status(200).json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving payments',
      error: error.message,
    });
  }
});

// ✅ Count All Payments
const getPaymentCount = asyncHandler(async (req, res) => {
  try {
    const count = await Payment.count();
    res.status(200).json({ success: true, total: count });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error counting payments',
      error: error.message,
    });
  }
});

// ✅ Exports
module.exports = {
  createPayment,
  updatePayment,
  getPayment,
  deletePayment,
  getAllPayments,
  getPaymentCount,
};
