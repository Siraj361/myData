const asyncHandler = require('express-async-handler');
const { Customer } = require('../models/index.js');
const { Op } = require('sequelize');
const crypto = require('crypto');

const getAllCustomers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const { searchTerm, statusAdv, typeAdv, fromDate, toDate } = req.query;

  // Build where clause
  const where = {};

  if (searchTerm) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${searchTerm}%` } },
      { email: { [Op.iLike]: `%${searchTerm}%` } },
      { address: { [Op.iLike]: `%${searchTerm}%` } },
    ];
  }
  if (statusAdv) where.status = statusAdv;
  if (typeAdv) where.type = typeAdv;

  if (fromDate && toDate) {
    where.latestPurchase = { [Op.between]: [fromDate, toDate] };
  } else if (fromDate) {
    where.latestPurchase = { [Op.gte]: fromDate };
  } else if (toDate) {
    where.latestPurchase = { [Op.lte]: toDate };
  }

  const { count: totalItems, rows: customers } = await Customer.findAndCountAll({
    where,
    offset,
    limit,
    order: [['name', 'ASC']],
  });

  const pageCount = Math.ceil(totalItems / limit);

  const privateCustomers = await Customer.count({ where: { type: 'Private' } });
  const companyCustomers = await Customer.count({ where: { type: 'Company' } });
  const purchaseAgreements = await Customer.count({ where: { agreementType: 'Purchase' } });
  const salesAgreements = await Customer.count({ where: { agreementType: 'Sale' } });
  const otherAgreements = await Customer.count({
    where: { agreementType: { [Op.notIn]: ['Purchase', 'Sale', null] } },
  });

  res.json({
    success: true,
    data: customers,
    totalItems,
    totalPages: pageCount,
    currentPage: page,
    stats: {
      privateCustomers,
      companyCustomers,
      totalCustomers: totalItems,
      purchaseAgreements,
      salesAgreements,
      otherAgreements
    }
  });
});
const createCustomer = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    telephone,
    address,
    type,
    status,
    socialSecurityNumber,
    postalCode,
    customerNumber,
    location
  } = req.body;
  const { corpId, id: userId } = req.user;

  if (!name || !email || !telephone || !address || !socialSecurityNumber) {
    return res.status(400).json({ success: false, message: 'Please provide all required customer details' });
  }

  const existingCustomer = await Customer.findOne({ where: { email } });
  if (existingCustomer) {
    return res.status(400).json({ success: false, message: 'A customer with this email already exists' });
  }

  const customer = await Customer.create({
    customerId: crypto.randomUUID(),
    corpId,
    userId,
    name,
    email,
    telephone,
    address,
    type,
    status,
    socialSecurityNumber,
    postalCode,
    customerNumber,
    location
  });

  res.status(201).json({ success: true, data: customer, message: 'Customer created successfully' });
});

const deleteCustomer = asyncHandler(async (req, res) => {
  const { customerId } = req.params;

  const customer = await Customer.findOne({ where: { customerId } });
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  await customer.destroy();
  res.json({ success: true, message: 'Customer deleted successfully', data: customer });
});

const getCustomerById = asyncHandler(async (req, res) => {
  const { customerNumber } = req.params;

  const customer = await Customer.findOne({
    where: { customerId: customerNumber },
    attributes: { exclude: ['id', 'corpId', 'userId'] }
  });

  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  res.json({ success: true, data: customer });
});

module.exports = {
    getAllCustomers,
    createCustomer,
    deleteCustomer,
    getCustomerById
}