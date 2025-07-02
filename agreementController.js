const db = require('../models');
const asyncHandler = require('express-async-handler');
const Agreement = db.Agreement;
const axios = require('axios');
const { getValitiveToken } = require('../services/valitiveAuthService');



const Receipt = db.Receipt; // Assuming you have a Receipt model defined in your models directory

// or your correct path

const createAgreement = asyncHandler(async (req, res) => {
  try {
    const {
      registrationNumber,
      purchaseDate,
      email,
      phone,
      purchasePrice,
      paymentMethod,
      vatType,
      creditMarking,
      mileage,
      latestService,
      numberOfKeys,
      deck,
      notes,
      creditor,
      depositor,
      creditAmount,
      name,
      customerType,
      address,
      birthDate,
      gender,
      salesDate,
      commissionRate,
      commissionAmount,
      agencyFee,
      insurer,
      insurerType,
      warrantyProvider,
      warrantyProduct,
      socialSecurityNumber,
      organizationNumber,
      tradeInType,
      tradeInRegistrationNumber,
      tradeInPurchaseDate,
      tradeInPurchasePrice,
      tradeInMileage,
      tradeInCreditMaking
    } = req.body;

    // Check duplicate registrationNumber
    const existing = await Agreement.findOne({ where: { registrationNumber } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Agreement with this registration number already exists',
      });
    }

    // Create agreement
    const agreement = await Agreement.create({
      registrationNumber,
      purchaseDate,
      email,
      phone,
      purchasePrice,
      paymentMethod,
      vatType,
      creditMarking,
      mileage,
      latestService,
      numberOfKeys,
      deck,
      notes,
      creditor,
      depositor,
      creditAmount,
      name,
      customerType,
      address,
      birthDate,
      gender,
      salesDate,
      commissionRate,
      commissionAmount,
      agencyFee,
      insurer,
      insurerType,
      warrantyProvider,
      warrantyProduct,
      socialSecurityNumber,
      organizationNumber,
      tradeInType,
      tradeInRegistrationNumber,
      tradeInPurchaseDate,
      tradeInPurchasePrice,
      tradeInMileage,
      tradeInCreditMaking
    });

    // Create receipt
    const receipt = await Receipt.create({
      receiptID: `RCPT-${Date.now()}`, // unique ID
      agreementID: agreement.id,        // FK from agreement
      amount: parseFloat(purchasePrice),
      date: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Agreement and receipt created successfully',
      data: {
        agreement,
        receipt
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating agreement and receipt',
      error: error.message,
    });
  }
});



const getAllAgreements = asyncHandler(async (req, res) => {
  try {
    const agreements = await Agreement.findAll();
    if (!agreements || agreements.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No agreements found',
      });
    }
    res.status(200).json({ success: true, data: agreements });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching agreements',
      error: error.message,
    });
  }
});
const getAgreementById = asyncHandler(async (req, res) => {
  try {
    const agreement = await Agreement.findByPk(req.params.id);

    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: 'Agreement not found',
      });
    }
    res.status(200).json({ success: true, data: agreement });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching agreement',
      error: error.message,
    });
  }
});
const updateAgreement = asyncHandler(async (req, res) => {
  try {
    const agreement = await Agreement.findByPk(req.params.id);
    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: 'Agreement not found',
      });
    }

    const {
      registrationNumber,
      purchaseDate,
      email,
      phone,
      purchasePrice,
      paymentMethod,
      vatType,
      creditMarking,
      mileage,
      latestService,
      numberOfKeys,
      deck,
      notes,
      creditor,
      depositor,
      creditAmount,
      name,
      customerType,
      address,
      birthDate,
      gender,
      salesDate,
      commissionRate,
      commissionAmount,
      agencyFee,
      insurer,
      insurerType,
      warrantyProvider,
      warrantyProduct,
      socialSecurityNumber,
      organizationNumber,
      tradeInType,
      tradeInRegistrationNumber,
      tradeInPurchaseDate,
      tradeInPurchasePrice,
      tradeInMileage,
      tradeInCreditMaking
    } = req.body;

    await agreement.update({
      registrationNumber,
      purchaseDate,
      email,
      phone,
      purchasePrice,
      paymentMethod,
      vatType,
      creditMarking,
      mileage,
      latestService,
      numberOfKeys,
      deck,
      notes,
      creditor,
      depositor,
      creditAmount,
      name,
      customerType,
      address,
      birthDate,
      gender,
      salesDate,
      commissionRate,
      commissionAmount,
      agencyFee,
      insurer,
      insurerType,
      warrantyProvider,
      warrantyProduct,
      socialSecurityNumber,
      organizationNumber,
      tradeInType,
      tradeInRegistrationNumber,
      tradeInPurchaseDate,
      tradeInPurchasePrice,
      tradeInMileage,
      tradeInCreditMaking
    });

    res.status(200).json({
      success: true,
      message: 'Agreement updated successfully',
      data: agreement,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating agreement',
      error: error.message,
    });
  }
});

const deleteAgreement = asyncHandler(async (req, res) => {
  try {
    const agreement = await Agreement.findByPk(req.params.id);
    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: 'Agreement not found',
      });
    }
    await agreement.destroy();
    res.status(200).json({
      success: true,
      message: 'Agreement deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting agreement',
      error: error.message,
    });
  }
});
const countAgreements = asyncHandler(async (req, res) => {
  try {
    const count = await Agreement.count();
    if (count === 0) {
      return res.status(404).json({
        success: false,
        message: 'No agreements found',
      });
    }
    res.status(200).json({ success: true, totalAgreements: count });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error counting agreements',
      error: error.message,
    });
  }
});


// const fetchValitiveAgreements = asyncHandler(async (req, res) => {
//   try {
//     const token = await getValitiveToken();

//     const response = await axios.put(`${process.env.VALITIVE_API_BASE_URL}/search/request`, {

      
//       filter: {
//         _type: "SPLIT",
//         partyType: "ORG",
//         country: "SE"
//       },
//       dataClasses: ["O1_0_BASIC", "O2_0_STATUS"],
//       frame: { startIndex: 0, count: 5 }
//     }, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//         Accept: "application/json",
//         "Content-Type": "application/json"
//       }
//     });
// // console.log("➡️ Valitive Token:", token);
// // console.log("➡️ Requesting:", `${process.env.VALITIVE_API_BASE_URL}/search/request`);

//     res.status(200).json({
//       success: true,
//       data: response.data
//     });
//   } catch (error) {
//     console.error("Error fetching Valitive data:", error.message);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch agreements from Valitive",
//       error: error.message
//     });
//   }
// });




const fetchValitiveAgreements = asyncHandler(async (req, res) => {
  try {
    const token = await getValitiveToken();
    const { type = "PERSON", query = "" } = req.body; // Use body for structured input
    const url = `${process.env.VALITIVE_API_BASE_URL}/search/request`;

    if (!query || query.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid search query (min 3 characters)"
      });
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    };

    let filter, dataClasses;

    if (type === "PERSON") {
      filter = {
        _type: "SIMPLE",
        partyType: "PERSON",
        country: "SE",
        what: query
      };
      dataClasses = [
        "P1_0_BASIC",
        "P1_1_GENERAL",
        "P1_2_EXTENDED",
        "P1_3_SE_REG"
        // "P3_0_PHONE_BASIC"
      ];
    } else if (type === "ORG") {
      filter = {
        _type: "SPLIT",
        partyType: "ORG",
        country: "SE",
        legalId: query
      };
      dataClasses = [
        "O1_0_BASIC",
        "O1_1_GENERAL",
        "O2_0_STATUS",
        "O2_1_BOARD",
        "O2_2_CONTACT",
        "O3_0_PHONE",
        "O4_0_LEGAL",
        "O5_0_FINANCE_BASIC",
        "O5_1_FINANCE_GENERAL"
      ];
    } else if (type === "VEHICLE") {
      filter = {
        _type: "SIMPLE",
        partyType: "VEHICLE",
        country: "SE",
        what: query
      };
      dataClasses = [
        "V1_0_BASIC",
        "V1_1_GENERAL",
        "V2_0_OWNER_BASIC",
        "V2_1_OWNER_GENERAL",
        "V3_0_STATUS",
        "V4_0_ORIGIN",
        "V5_0_TECH_SPEC_BASIC",
        "V6_0_ENVIRONMENTAL"
      ];
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid type specified. Use PERSON, ORG, or VEHICLE."
      });
    }

    const payload = {
      filter,
      dataClasses,
      clientTag: "myClient",
      frame: { startIndex: 0, count: 1 }
    };

    const response = await axios.put(url, payload, { headers });
    const results = response.data?.results || [];

    return res.status(200).json({
      success: true,
      type,
      keyword: query,
      count: results.length,
      data: results
    });

  } catch (error) {
    console.error("❌ Valitive API Error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Failed to fetch data from Valitive",
      error: error.message,
      details: error.response?.data || null
    });
  }
});

const fetchValitiveOrgInfo = asyncHandler(async (req, res) => {
  try {
    const token = await getValitiveToken();
    const { orgId = "", country = "SE" } = req.body;

    if (!orgId) {
      return res
        .status(400)
        .json({ success: false, message: "orgId is required" });
    }

    const url = `${process.env.VALITIVE_API_BASE_URL}/search/request`;
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const payload = {
      filter: {
        _type: "SIMPLE",
        partyType: "ORG",
        country,
        what: orgId,
      },
      dataClasses: ["O1_0_BASIC", "O1_1_GENERAL", "O2_0_STATUS"],
      clientTag: "org-info",
      frame: { startIndex: 0, count: 1 },
    };

    console.log("➡️ Payload sent:", payload);

    const response = await axios.put(url, payload, { headers });
    // Log the entire response body for inspection:
    console.log("📦 Valitive Response:", response.data);

    // Assuming the API returns an object with orgId and country
    const { orgId: id, country: ctry, ...rest } = response.data;

    return res.status(200).json({
      success: true,
      data: {
        orgId: id,
        country: ctry,
        ...rest,
      },
    });
  } catch (error) {
    console.error("❌ Org Info Fetch Error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Failed to fetch organization info from Valitive",
      error: error.message,
      details: error.response?.data || null,
    });
  }
});











module.exports = {
  createAgreement,
  getAllAgreements,
  getAgreementById,
  updateAgreement,
  deleteAgreement,
  countAgreements,
  fetchValitiveAgreements,
  fetchValitiveOrgInfo
};