// src/controllers/receiptController.js
const { Receipt } = require('../models');  // Make sure you're importing from the correct path

// Create a new receipt
const createReceipt = async (req, res) => {
  try {
    const { receiptID, agreementID, amount, date } = req.body;

    const newReceipt = await Receipt.create({
      receiptID,
      agreementID,
      amount,
      date,
    });

    res.status(201).json({
      message: 'Receipt created successfully',
      data: newReceipt,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error creating receipt',
      error: error.message,
    });
  }
};

// Get the total receipt count
const getTotalReceiptCount = async (req, res) => {
  try {
    const count = await Receipt.count();
    res.status(200).json({
      message: 'Total receipt count fetched successfully',
      data: { count },
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching receipt count',
      error: error.message,
    });
  }
};

// Update a receipt by ID
const updateReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { receiptID, agreementID, amount, date } = req.body;

    const receipt = await Receipt.findByPk(id);

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    receipt.receiptID = receiptID || receipt.receiptID;
    receipt.agreementID = agreementID || receipt.agreementID;
    receipt.amount = amount || receipt.amount;
    receipt.date = date || receipt.date;

    await receipt.save();

    res.status(200).json({
      message: 'Receipt updated successfully',
      data: receipt,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error updating receipt',
      error: error.message,
    });
  }
};

// Get a single receipt by ID
const getSingleReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await Receipt.findByPk(id);

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    res.status(200).json({
      message: 'Receipt fetched successfully',
      data: receipt,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching receipt',
      error: error.message,
    });
  }
};

// Get all receipts
const getAllReceipts = async (req, res) => {
  try {
    const receipts = await Receipt.findAll();

    res.status(200).json({
      message: 'All receipts fetched successfully',
      data: receipts,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching receipts',
      error: error.message,
    });
  }
};

// Delete a receipt by ID
const deleteReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await Receipt.findByPk(id);

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    await receipt.destroy();

    res.status(200).json({
      message: 'Receipt deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error deleting receipt',
      error: error.message,
    });
  }
};

module.exports = {
  createReceipt,
  getTotalReceiptCount,
  updateReceipt,
  getSingleReceipt,
  getAllReceipts,
  deleteReceipt,
};

