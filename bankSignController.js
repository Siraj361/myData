const { startSignOrAuth, collectStatus } = require('../services/bankSignService');

const startBankSign = async (req, res) => {
  try {
    const { endUserIp, userVisibleData, userNonVisibleData } = req.body;
 
    if (!endUserIp) {
      return res.status(400).json({ error: 'Missing endUserIp' });
    }
 
    const result = await startSignOrAuth({ endUserIp, userVisibleData, userNonVisibleData });
 
    if (!result) {
      return res.status(500).json({ error: 'BankSign failed to start' });
    }
 
    res.json(result);
  } catch (err) {
    console.error('❌ Controller Error [startBankSign]:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
// Poll for status
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
module.exports = {
startBankSign,
 checkBankSignStatus
};
 
 