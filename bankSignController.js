const db = require('../models/index.js');

const Agreement = db.Agreement;
const SignedAgreement = db.SignedAgreement;
const axios = require('axios');
const { startSignOrAuth, collectStatus } = require('../services/bankSignService');

// 🔹 Start BankID Signing
const startBankSign = async (req, res) => {
  try {
    const { agreementID, endUserIp, userVisibleData, userNonVisibleData } = req.body;

    if (!agreementID || !endUserIp) {
      return res.status(400).json({ error: 'Missing agreementID or endUserIp' });
    }

    // Check if agreement exists
    const agreement = await Agreement.findByPk(agreementID);
    if (!agreement) {
      return res.status(404).json({ error: 'Agreement not found' });
    }

    // Start BankID sign process
    const result = await startSignOrAuth({ endUserIp, userVisibleData, userNonVisibleData });
    if (!result || !result.orderRef) {
      return res.status(500).json({ error: 'BankSign failed to start' });
    }

    // Save to SignedAgreement
    const signedAgreement = await SignedAgreement.create({
      agreementID,
      orderRef: result.orderRef,
      stats: 'pending'
    });
  
    res.status(200).json({
      success: true,
      message: 'BankID sign started and saved',
      signedAgreement,
      bankIdResponse: result
    });
  } catch (err) {
    console.error('❌ Controller Error [startBankSign]:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 🔹 Poll BankID Status
const checkBankSignStatus = async (req, res) => {
  try {
    const { orderRef } = req.body;

    if (!orderRef) {
      return res.status(400).json({ error: 'Missing orderRef' });
    }

    const status = await collectStatus(orderRef);

    if (!status) {
      return res.status(404).json({ error: 'No status found or failed to fetch' });
    }

    res.json(status);
  } catch (err) {
    console.error('❌ Controller Error [checkBankSignStatus]:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 🔹 Send SMS with BankID Link
const sendBankIdLinkSMS = async (req, res) => {
  try {
    const { phone, link } = req.body;
if (!phone || !link) {
  return res.status(400).json({ error: 'Missing phone or link' });
}


    const token = process.env.PIXIE_API_TOKEN;

    const response = await axios.post('https://app.pixie.se/api/v2/sms', {
      sender: 'leadyPro',
      message: `Log in with BankID: ${link}`,
      recipients: [phone]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    res.json({ success: true, sms: response.data });
  } catch (err) {
    console.error('❌ SMS Send Error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
};

module.exports = {
  startBankSign,
  checkBankSignStatus,
  sendBankIdLinkSMS
};
