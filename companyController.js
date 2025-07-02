const db = require('../models/index.js');
const asyncHandler = require('express-async-handler');
const { Op, Sequelize } = require('sequelize');
const Company = db.company;

// const createCompany = asyncHandler(async (req, res) => {
//   const { organisationNumber } = req.body;
//   const { corpId, id: userId } = req.user;

//   if (!organisationNumber) {
//     return res.status(400).json({ success: false, message: 'organisationNumber is required' });
//   }

//   let exists = await Company.findOne({ where: { organisationNumber } });
//   if (exists) {
//     return res.status(409).json({ success: false, message: 'Company with this organisation number already exists' });
//   }

//   try {
//     const newCompany = await Company.create({ ...req.body, corpId, createdBy: userId });
//     return res.status(201).json({ success: true, data: newCompany });
//   } catch (error) {
//     return res.status(500).json({ success: false, message: 'Error creating company', error: error.message });
//   }
// });






const createCompany = asyncHandler(async (req, res) => {
  const { organisationNumber } = req.body;
  const { corpId, id: userId } = req.user;

  if (!organisationNumber) {
    return res.status(400).json({ success: false, message: 'organisationNumber is required' });
  }

  const exists = await Company.findOne({ where: { organisationNumber } });
  if (exists) {
    return res.status(409).json({ success: false, message: 'Company with this organisation number already exists' });
  }

  try {
    const companyData = {
      companyId: req.body.companyId,
      organisationNumber: req.body.organisationNumber,
      businessUnitId: req.body.businessUnitId,
      name: req.body.name,
      visitorAddress: req.body.visitorAddress,
      postalAddress: req.body.postalAddress,
      email: req.body.email,
      homePage: req.body.homePage,
      location: req.body.location,
      phoneNumbers: req.body.phoneNumbers,
      marketingProtection: req.body.marketingProtection,
      displayName: req.body.displayName,
      naceCategories: req.body.naceCategories || [],
      proffNames: req.body.proffNames || [],
      revenue: req.body.revenue,
      profit: req.body.profit,
      currency: req.body.currency,
      companyAccountsLastUpdatedDate: req.body.companyAccountsLastUpdatedDate,
      foundationYear: req.body.foundationYear,
      foundationDate: req.body.foundationDate,
      numberOfEmployees: req.body.numberOfEmployees,
      status: req.body.status,
      companyRoles: req.body.companyRoles,
      personRoles: req.body.personRoles,
      mainOffice: req.body.mainOffice,
      secretData: req.body.secretData,
      note: req.body.note,
      corpId: corpId,
      createdBy: userId
    };

    const newCompany = await Company.create(companyData);
    return res.status(201).json({ success: true, data: newCompany });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error creating company', error: error.message });
  }
});

const getAllCompanies = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const { searchTerm, status, county, municipality, foundationYear } = req.query;
  const where = {};

  if (searchTerm) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${searchTerm}%` } },
      { displayName: { [Op.iLike]: `%${searchTerm}%` } },
      { organisationNumber: { [Op.iLike]: `%${searchTerm}%` } },
      { companyId: { [Op.iLike]: `%${searchTerm}%` } }
    ];
  } else {
    if (status) where['status.status'] = status;
    if (county) where['location.county'] = { [Op.iLike]: `%${county}%` };
    if (municipality) where['location.municipality'] = { [Op.iLike]: `%${municipality}%` };
    if (foundationYear) where.foundationYear = foundationYear;
  }

  const { rows: companies, count: totalItems } = await Company.findAndCountAll({
    where,
    offset,
    limit
  });

  const activeCompanies = await Company.count({ where: { 'status.status': 'ACTIVE' } });

  res.status(200).json({
    success: true,
    data: companies,
    totalItems,
    currentPage: page,
    totalPages: Math.ceil(totalItems / limit),
    stats: { activeCompanies, totalCompanies: totalItems }
  });
});

const getCompanyById = asyncHandler(async (req, res) => {
  const { organisationNumber } = req.params;
  const { corpId } = req.user;

  if (!organisationNumber) {
    return res.status(400).json({ success: false, message: 'organisationNumber is required' });
  }

  const company = await Company.findOne({ where: { organisationNumber, corpId } });

  if (!company) {
    return res.status(404).json({ success: false, message: 'Company not found' });
  }

  res.status(200).json({ success: true, data: company });
});

const updateCompany = asyncHandler(async (req, res) => {
  const { organisationNumber } = req.params;
  const { corpId } = req.user;

  const [updated] = await Company.update(req.body, { where: { organisationNumber, corpId } });

  if (!updated) {
    return res.status(404).json({ success: false, message: 'Company not found' });
  }

  const updatedCompany = await Company.findOne({ where: { organisationNumber, corpId } });
  res.status(200).json({ success: true, data: updatedCompany });
});

const deleteCompany = asyncHandler(async (req, res) => {
  const { organisationNumber } = req.params;
  const { corpId } = req.user;

  const deleted = await Company.destroy({ where: { organisationNumber, corpId } });

  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Company not found or already deleted' });
  }

  res.status(200).json({ success: true, message: 'Company deleted successfully' });
});

const searchCompany = asyncHandler(async (req, res) => {
  const { query } = req.query;
  const { corpId } = req.user;

  if (!query) {
    return res.status(400).json({ success: false, message: 'Search query is required' });
  }

  const companies = await Company.findAll({
    where: {
      corpId,
      [Op.or]: [
        { name: { [Op.iLike]: `%${query}%` } },
        { displayName: { [Op.iLike]: `%${query}%` } },
        { organisationNumber: { [Op.iLike]: `%${query}%` } },
        { companyId: { [Op.iLike]: `%${query}%` } }
      ]
    },
    limit: 20
  });

  res.status(200).json({ success: true, data: companies });
});

const getCompanyStats = asyncHandler(async (req, res) => {
  const { corpId } = req.user;

  try {
    const stats = await Company.findAll({
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalCompanies'],
        [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN status->>'status' = 'ACTIVE' THEN 1 ELSE 0 END")), 'activeCompanies'],
        [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN revenue IS NOT NULL THEN 1 ELSE 0 END")), 'companiesWithRevenue'],
        [Sequelize.fn('AVG', Sequelize.cast(Sequelize.col('numberOfEmployees'), 'FLOAT')), 'averageEmployees']
      ],
      where: { corpId },
      raw: true
    });

    res.status(200).json({ success: true, data: stats[0] });
  } catch (error) {
    console.error('Company stats error:', error);
    res.status(500).json({ success: false, message: 'Error fetching company statistics' });
  }
});

module.exports = {
  createCompany,
  getAllCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  searchCompany,
  getCompanyStats
};
