const db = require('../models');
const { Op } = require('sequelize');
const asyncHandler = require('express-async-handler');
const Vehicle = db.Vehicle;


const { writeGenFile } = require('../services/genHelper.js');
const { uploadFileSftp } = require('../services/sftpupload.js');



const createVehicle = asyncHandler(async (req, res) => {
  try {
    const {
      registrationNumber, model, vehicleName, year,
      category, status, importOrigin, registrationDate,
      price, mileage, daysInStock, fuelType, gearbox, drive,
      color, horsepower, notes, outlay, equipment, documents,
      type, chassisNumber, preRegistrationDate, registrationRenewed,
      statusDate, engineVolume, maxSpeed, serviceWeight, totalWeight,
      vehicleWeight, passengers, variant, version, typeCode, ecoCertificate,
      currentOwner, acquisitionDate, totalOwners, organizationOwner,
      lastInspection, nextInspectionDue, inspectionMileage, inspectionStation,
      importID, directImport
    } = req.body;

    const existing = await Vehicle.findOne({ where: { registrationNumber } });
if (existing) {
  return res.status(400).json({
    success: false,
    message: 'Vehicle with this registration number already exists'
  });
}


    const vehicle = await Vehicle.create({
      registrationNumber,
      model,
      vehicleName: vehicleName || 'Volvo V50',
      year,
      category,
      status,
      importOrigin,
      registrationDate,
      price,
      mileage,
      daysInStock,
      fuelType,
      gearbox,
      drive,
      color,
      horsepower,
      notes: Array.isArray(notes) ? notes : [],
      outlay: Array.isArray(outlay) ? outlay : [],
      equipment,
      documents: Array.isArray(documents) ? documents : [],
      type,
      chassisNumber,
      preRegistrationDate,
      registrationRenewed,
      statusDate,
      engineVolume,
      maxSpeed,
      serviceWeight,
      totalWeight,
      vehicleWeight,
      passengers,
      variant,
      version,
      typeCode,
      ecoCertificate,
      currentOwner,
      acquisitionDate,
      totalOwners,
      organizationOwner,
      lastInspection,
      nextInspectionDue,
      inspectionMileage,
      inspectionStation,
      importID,
      directImport,
    });

    res.status(201).json({
      success: true,
      message: 'Vehicle created successfully',
      data: vehicle,
    });
  } catch (error) {
    console.error('❌ Error creating vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create vehicle',
      error: error.message,
    });
  }
});

const getAllVehicles = asyncHandler(async (req, res) => {
 try{
    const vehicles = await Vehicle.findAll();
  res.status(200).json({ success: true, data: vehicles });
 }catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching vehicles',
      error: error.message,
    });
  }
});

const getVehicleByRegistrationNumber = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findOne({
    where: { registrationNumber: req.params.registrationNumber },
  });

  if (!vehicle) {
    return res.status(404).json({ success: false, message: 'Vehicle not found' });
  }

  res.status(200).json({ success: true, data: vehicle });
});

const updateVehicle = asyncHandler(async (req, res) => {
  try {
    const { registrationNumber } = req.params;
    const { documents, notes, outlay } = req.body;

    const formattedNotes = Array.isArray(notes) ? notes : [];
    const formattedDocuments = Array.isArray(documents) ? documents : [];
    const formattedOutlay = Array.isArray(outlay) ? outlay : [];

    const vehicle = await Vehicle.findOne({
      where: { registrationNumber },
    });

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    await vehicle.update({
      ...req.body,
      documents: formattedDocuments,
      notes: formattedNotes,
      outlay: formattedOutlay,
    });

    res.status(200).json({
      success: true,
      message: 'Vehicle updated',
      data: vehicle,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating vehicle',
      error: error.message,
    });
  }
});

const deleteVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findOne({
    where: { registrationNumber: req.params.registrationNumber },
  });

  if (!vehicle) {
    return res.status(404).json({ success: false, message: 'Vehicle not found' });
  }

  await vehicle.destroy();
  res.status(200).json({ success: true, message: 'Vehicle deleted successfully' });
});

const countAllVehicles = asyncHandler(async (req, res) => {
  const count = await Vehicle.count();
  res.status(200).json({ success: true, totalVehicles: count });
});

const filterVehicles = asyncHandler(async (req, res) => {
  const filters = {};

  if (req.query.vehicleType) {
    filters.category = { [Op.like]: req.query.vehicleType };
  }
  if (req.query.status && req.query.status !== 'All Statuses') {
    filters.status = { [Op.like]: req.query.status };
  }
  if (req.query.gearbox && req.query.gearbox !== 'All Gearboxes') {
    filters.gearbox = { [Op.like]: req.query.gearbox };
  }
  if (req.query.mileageFrom && req.query.mileageTo) {
    filters.mileage = { [Op.between]: [req.query.mileageFrom, req.query.mileageTo] };
  }
  if (req.query.yearFrom && req.query.yearTo) {
    filters.year = { [Op.between]: [req.query.yearFrom, req.query.yearTo] };
  }
  if (req.query.fuelType && req.query.fuelType !== 'All Fuel Types') {
    filters.fuelType = { [Op.like]: req.query.fuelType };
  }

  const vehicles = await Vehicle.findAll({ where: filters });

  if (vehicles.length === 0) {
    return res.status(404).json({ success: false, message: 'No vehicles found matching the criteria' });
  }

  res.status(200).json({ success: true, data: vehicles });
});

const exportInventory = asyncHandler(async (req, res) => {
  const dealerName = req.user.dealerName;
  const vehicles = await Vehicle.findAll({ where: { dealerId: req.user.id } });

  if (vehicles.length === 0) {
    return res.status(400).json({ message: 'No vehicles to export' });
  }

  const fileName = await writeGenFile(vehicles, dealerName);
  await uploadFileSftp(fileName, `/${fileName}`);
  return res.json({ success: true, message: 'Inventory exported and uploaded', fileName });
});


module.exports = {
  createVehicle,
  getAllVehicles,
  getVehicleByRegistrationNumber,
  updateVehicle,
  deleteVehicle,
  countAllVehicles,
  filterVehicles,
  exportInventory
};
