const db = require('../models');
const asyncHandler = require('express-async-handler');
const Invoice = db.invoice;

// ✅ CREATE
const createInvoice = asyncHandler(async (req, res) => {
  try {
    const {
      invoiceNumber,
      orgNumber,
      status = 'Pending',
      invoiceDate,
      dueDate,
      expirationDate,
      currency = 'SEK',
      language,
      website,
      customerType,
      customerName,
      email,
      telephoneNumber,
      inReference,
      ourReference,
      items,
      net,
      moms,
      amount
    } = req.body;

    const newInvoice = await Invoice.create({
      invoiceNumber,
      orgNumber,
      status,
      invoiceDate,
      dueDate,
      expirationDate,
      currency,
      language,
      website,
      customerType,
      customerName,
      email,
      telephoneNumber,
      inReference,
      ourReference,
      items,
      net,
      moms,
      amount
    });

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      invoice: newInvoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating invoice',
      error: error.message,
    });
  }
});

// ✅ UPDATE
const updateInvoice = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findByPk(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    await invoice.update(req.body);

    res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      invoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating invoice',
      error: error.message,
    });
  }
});

// ✅ GET SINGLE
const getSingleInvoice = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findByPk(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    res.status(200).json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching invoice',
      error: error.message,
    });
  }
});

// ✅ GET ALL
const getAllInvoices = asyncHandler(async (req, res) => {
  try {
    const invoices = await Invoice.findAll();
    res.status(200).json({ success: true, invoices });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching invoices',
      error: error.message,
    });
  }
});

// ✅ COUNT
const getTotalInvoiceCount = asyncHandler(async (req, res) => {
  try {
    const count = await Invoice.count();
    res.status(200).json({ success: true, totalInvoices: count });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error counting invoices',
      error: error.message,
    });
  }
});

// ✅ DELETE
const deleteInvoice = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findByPk(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    await invoice.destroy();

    res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting invoice',
      error: error.message,
    });
  }
});

// ✅ EXPORT
module.exports = {
  createInvoice,
  updateInvoice,
  getSingleInvoice,
  getAllInvoices,
  getTotalInvoiceCount,
  deleteInvoice,
};
