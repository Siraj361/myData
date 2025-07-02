const db = require('../models/index.js');
const asyncHandler = require('express-async-handler');

const Payout = db.payout;

const createPayout = asyncHandler(async (req, res) => {
  try {
    const {
      payoutInstructionUUID,
      payerPaymentReference,
      signingCertificateSerialNumber,
      payerAlias,
      payeeAlias,
      payeeSSN,
      amount,
      currency,
      payoutType,
      instructionDate,
      message,
      callbackUrl,
      signature,
      callbackIdentifier
    } = req.body;

    if (
      !payoutInstructionUUID || !payerPaymentReference || !signingCertificateSerialNumber ||
      !payerAlias || !payeeAlias || !payeeSSN || !amount || !currency || !payoutType ||
      !instructionDate || !callbackUrl || !signature
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields in the request body',
      });
    }

    // Check if payoutInstructionUUID already exists
    const existingPayout = await Payout.findOne({ where: { payoutInstructionUUID } });

    if (existingPayout) {
      return res.status(409).json({
        success: false,
        message: 'Payout with this payoutInstructionUUID already exists',
      });
    }

    const newPayout = await Payout.create({
      payoutInstructionUUID,
      payerPaymentReference,
      signingCertificateSerialNumber,
      payerAlias,
      payeeAlias,
      payeeSSN,
      amount,
      currency,
      payoutType,
      instructionDate,
      message,
      callbackUrl,
      signature,
      callbackIdentifier
    });

    res.status(201).json({
      success: true,
      message: 'Payout created successfully',
      data: newPayout,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating payout',
      error: error.message,
    });
  }
});
const getAllPayouts = asyncHandler(async (req, res) => {
  try {
    const payouts = await Payout.findAll();
    if (!payouts || payouts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No payouts found',
      });
    }
    res.status(200).json({ success: true, data: payouts });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payouts',
      error: error.message,
    });
  }
});
const getPayoutByInstructionUUID = asyncHandler(async (req, res) => {
  try { 
    const { instructionUUID } = req.params;

    if (!instructionUUID) {
      return res.status(400).json({
        success: false,
        message: 'Instruction UUID is required',
      });
    }

    const payout = await Payout.findOne({ where: { payoutInstructionUUID: instructionUUID } });

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found for the given instruction UUID',
      });
    }

    res.status(200).json({ success: true, data: payout });

  }catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payout by instruction UUID',
      error: error.message,
    });
  }
});


module.exports = {
  createPayout,
getAllPayouts,  
getPayoutByInstructionUUID
};
