const db = require('../models/index.js'); // Sequelize models
const Org = db.org;
const Corp = db.corp;
const User = db.users;
const bcrypt = require('bcryptjs');
const Role = db.roles;
const Permission = db.permissions;
const Resource = db.resources;
const asyncHandler = require('express-async-handler');


const searchOrg = asyncHandler(async (req, res) => {
  const { organization_number } = req.body;

  if (!organization_number || organization_number === '') {
    return res.status(400).json({ success: false, message: 'Organization number is required' });
  }

  try {
    const orgData = await getOrgFromAPI(organization_number);

    if (!orgData) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const address = orgData.addresses.find(a => a.kind === 'VISIT') || orgData.addresses[0];

    const transformedData = {
      organization_number: orgData.legalId,
      corp_name: orgData.orgName?.name || '',
      street_address: address ? `${address.street} ${address.number}${address.numberSuffix || ''}`.trim() : '',
      registered_city: address?.municipality || '',
      postal_code: address?.zip || '',
      city: address?.city || '',
      company_email: orgData.emails?.[0] || '',
      company_phone: orgData.phones?.[0] || ''
    };

    // Optional: Save to Sequelize Org model if needed
    // await Org.create(transformedData);

    return res.status(200).json({ success: true, data: transformedData });
  } catch (error) {
    console.error('Error searching organization:', error);
    return res.status(500).json({ success: false, message: 'Failed to search organization' });
  }
});

const publicSearchOrg = asyncHandler(async (req, res) => {
  const { organization_number } = req.body;

  if (!organization_number) {
    return res.status(400).json({ success: false, message: 'Organization number is required' });
  }

  try {
    const orgData = await getOrgFromAPI(organization_number);
    if (!orgData) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const address = orgData.addresses.find(a => a.kind === 'VISIT') || orgData.addresses[0];

    const transformedData = {
      organization_number: organization_number,
      corp_name: orgData.orgName?.name || '',
      street_address: address ? `${address.street} ${address.number}${address.numberSuffix || ''}`.trim() : '',
      registered_city: address?.municipality || '',
      postal_code: address?.zip || '',
      city: address?.city || '',
      company_email: orgData.emails?.[0] || '',
      company_phone: orgData.phones?.[0] || '',
      vat_number: orgData.taxInfo?.vatNumber || '',
      is_f_skatt_payer: orgData.taxInfo?.fskattPayer || false,
      contact_person: orgData.contactInfo?.name || '',
      business_description: orgData.businessActivity || '',
      business_category: orgData.primaryBusinessCategory?.description || '',
      legal_form: orgData.legalForm?.name || '',
      website: orgData.urls?.[0] || '',
      established_year: orgData.lifecycle?.establishedInYear || null,
      company_status: orgData.lifecycle?.status?.value || ''
    };

    // Optional: Save to Sequelize model
    // await Org.create(transformedData);

    return res.status(200).json({ success: true, data: transformedData });
  } catch (error) {
    console.error('Error searching organization:', error);
    return res.status(500).json({ success: false, message: 'Failed to search organization' });
  }
});

const getAll = asyncHandler(async (req, res) => {
  const { corp_id } = req.user;

  const orgs = await Org.findAll({
    where: { corpId: corp_id }, // adapt field name if it's corpId or corp_id
    attributes: [
      ['legalId', 'legalId'],
      ['orgName', 'orgName'],
      [sequelize.col('lifecycle.status'), 'lifecycle_status'],
      ['primaryBusinessCategory', 'primaryBusinessCategory'],
      ['legalForm', 'legalForm'],
      [sequelize.col('taxInfo.vatNumber'), 'vatNumber'],
      [sequelize.col('manpower.nrOfEmployeesOrg'), 'nrOfEmployeesOrg']
    ],
    raw: true
  });

  return res.status(200).json({ success: true, data: orgs });
});

const getById = asyncHandler(async (req, res) => {
  const { legalId } = req.params;
  const { corp_id } = req.user;

  if (!legalId) {
    return res.status(400).json({ success: false, message: 'legalId is required' });
  }

  const org = await Org.findOne({
    where: {
      legalId,
      corpId: corp_id // Adjust the field name if it's different in your schema
    }
  });

  if (!org) {
    return res.status(404).json({ success: false, message: 'Organization not found' });
  }

  return res.status(200).json({ success: true, data: org });
});

const deleteById = asyncHandler(async (req, res) => {
  const { legalId } = req.params;
  const { corp_id } = req.user;

  if (!legalId) {
    return res.status(400).json({ success: false, message: 'legalId is required' });
  }

  const deleted = await Org.destroy({
    where: {
      legalId,
      corpId: corp_id // Adjust if your column name differs
    }
  });

  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Organization not found or already deleted' });
  }

  return res.status(200).json({ success: true, message: 'Organization deleted' });
});

const refreshOrg = asyncHandler(async (req, res) => {
  const { legalId } = req.params;
  const { corp_id, id: user_id } = req.user;

  if (!legalId) {
    return res.status(400).json({ success: false, message: 'legalId is required' });
  }

  // Get fresh data from external API
  const orgData = await getOrgFromAPI(legalId);
  if (!orgData) {
    return res.status(404).json({ success: false, message: 'Organization not found in API' });
  }

  // Set corp_id and user_id for update
  orgData.corpId = corp_id;
  orgData.userId = user_id;

  // Update the record using Sequelize
  const [updatedCount, [updatedOrg]] = await Org.update(
    orgData,
    {
      where: { legalId, corpId: corp_id },
      returning: true
    }
  );

  if (!updatedCount) {
    return res.status(404).json({ success: false, message: 'Organization not found in database' });
  }

  return res.status(200).json({ success: true, data: updatedOrg });
});

const validateRequiredFields = (data) => {
    const requiredFields = {
        'Organization Number': data.organization_number,
        'Corporation Name': data.corp_name,
        'Admin Email': data.admin_data?.email,
        'Admin Password': data.admin_data?.password,
        'Admin First Name': data.admin_data?.first_name,
        'Admin Last Name': data.admin_data?.last_name
    };

    // Filter out fields with missing (null/undefined/empty) values
    const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value)
        .map(([field]) => field);

    return missingFields;
};

const registerFullOrganization = asyncHandler(async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { organization_number, corp_name, admin_data = {}, allowed_resources = [], ...orgData } = req.body;

    const missing = validateRequiredFields(req.body);
    if (missing.length) throw new Error(`Missing required fields: ${missing.join(', ')}`);

    const existingUser = await User.findOne({ where: { email: admin_data.email }, transaction: t });
    if (existingUser) throw new Error('A user with this email already exists');

    const existingOrg = await Org.findOne({ where: { legalId: organization_number }, transaction: t });
    if (existingOrg) throw new Error('Organization with this number already exists');

    const corpId = generateId('CORP');
    const newCorp = await Corp.create({
      corpId,
      corpName: corp_name,
      corpActive: true,
      allowedResources: allowed_resources
    }, { transaction: t });

    let adminRole = await Role.findOne({
      where: { corpId, name: 'Admin', isSystem: true }, transaction: t
    });
    if (!adminRole) {
      adminRole = await Role.create({
        roleId: generateId('ROLE'),
        corpId,
        name: 'Admin',
        description: `Corporation ${corp_name} administrator`,
        isSystem: true
      }, { transaction: t });
    }

    const resources = await Resource.findAll({
      where: { resourceId: allowed_resources },
      transaction: t
    });

    for (const resource of resources) {
      const subPerms = (resource.hasSubresources && resource.subresources)
        ? resource.subresources.map(s => ({
            subresource_route: s.route,
            can_read: true, can_create: true, can_update: true, can_delete: true
          }))
        : null;

      await Permission.create({
        permissionId: generateId('PERM'),
        roleId: adminRole.id,
        resourceId: resource.resourceId,
        canRead: true, canCreate: true, canUpdate: true, canDelete: true,
        subresourcePermissions: subPerms
      }, { transaction: t });
    }

    const hashedPassword = await bcrypt.hash(admin_data.password, 10);
    const adminUser = await User.create({
      id: generateId('USER'),
      corpId,
      roleId: adminRole.id,
      first: admin_data.first_name,
      last: admin_data.last_name,
      email: admin_data.email,
      password: hashedPassword,
      type: 'Admin',
      active: true
    }, { transaction: t });

    const apiOrgData = await getOrgFromAPI(organization_number);
    if (!apiOrgData) throw new Error('Organization not found in API');

    const finalOrg = await Org.create({
      ...orgData,
      ...apiOrgData,
      corpId,
      userId: adminUser.id,
      legalId: organization_number,
      country: apiOrgData.country
    }, { transaction: t });

    await t.commit();

    res.status(201).json({
      success: true,
      data: { corporation: newCorp, organization: finalOrg, admin_user: adminUser }
    });
  } catch (err) {
    await t.rollback();
    console.error('Error in registerFullOrganization:', err);
    const statusCode = /Missing required fields/.test(err.message) ? 400 : 500;
    res.status(statusCode).json({ success: false, message: err.message });
  }
});

const updateFullOrganization = asyncHandler(async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const {
      corp_id, organization_number,
      corp_name, street_address, registered_city,
      postal_code, city, company_email, company_phone,
      corp_active, allowed_resources
    } = req.body;

    if (!organization_number || !corp_id) {
      throw new Error('Organization number and corporation ID are required');
    }

    // Find existing organization
    let existingOrg = await Org.findOne({
      where: { legalId: organization_number, corpId: corp_id },
      transaction: t
    });

    // If not, fetch from API and insert
    if (!existingOrg) {
      const apiOrgData = await getOrgFromAPI(organization_number);
      if (!apiOrgData) throw new Error('Organization not found in API');

      const corp = await Corp.findOne({ where: { id: corp_id }, transaction: t });
      if (!corp) throw new Error('Associated corporation not found');

      existingOrg = await Org.create({
        corpId: corp.id,
        userId: req.user.id,
        legalId: organization_number,
        country: apiOrgData.country,
        orgName: apiOrgData.orgName,
        addresses: apiOrgData.addresses,
        emails: apiOrgData.emails,
        phones: apiOrgData.phones,
        ...apiOrgData
      }, { transaction: t });
    }

    const corpRecord = await Corp.findByPk(corp_id, { transaction: t });
    if (!corpRecord) throw new Error('Corporation not found');

    // Update corporation
    const updatedCorp = await corpRecord.update({
      corpName: corp_name ?? corpRecord.corpName,
      corpActive: corp_active ?? corpRecord.corpActive,
      allowedResources: allowed_resources ?? corpRecord.allowedResources
    }, { transaction: t });

    // Update organization
    const updatedOrg = await existingOrg.update({
      'orgName.name': corp_name ?? existingOrg.orgName.name,
      'addresses[0].street': street_address ?? existingOrg.addresses[0]?.street,
      'addresses[0].municipality': registered_city ?? existingOrg.addresses[0]?.municipality,
      'addresses[0].zip': postal_code ?? existingOrg.addresses[0]?.zip,
      'addresses[0].city': city ?? existingOrg.addresses[0]?.city,
      'emails[0]': company_email ?? existingOrg.emails[0],
      'phones[0]': company_phone ?? existingOrg.phones[0]
    }, { transaction: t });

    await t.commit();

    res.status(200).json({
      success: true,
      data: { corporation: updatedCorp, organization: updatedOrg }
    });

  } catch (err) {
    await t.rollback();
    console.error('Error in updateFullOrganization:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});
const checkOrgExists = asyncHandler(async (req, res) => {
  const { organization_number } = req.body;
  if (!organization_number) {
    return res.status(400).json({ success: false, message: 'Organization number is required' });
  }

  try {
    // Find organization via Sequelize
    const org = await Org.findOne({ where: { legalId: organization_number } });

    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found in database' });
    }

    // Extract address, fallback safely
    const addresses = org.addresses || [];
    const visitAddress = addresses.find(a => a.kind === 'VISIT') || addresses[0] || {};

    const transformedData = {
      organization_number: org.legalId,
      corp_name: org.orgName?.name || '',
      street_address: visitAddress.street
        ? `${visitAddress.street} ${visitAddress.number || ''}${visitAddress.numberSuffix || ''}`.trim()
        : '',
      registered_city: visitAddress.municipality || '',
      postal_code: visitAddress.zip || '',
      city: visitAddress.city || '',
      company_email: (org.emails || [])[0] || '',
      company_phone: (org.phones || [])[0] || '',
      vat_number: org.taxInfo?.vatNumber || '',
      is_f_skatt_payer: org.taxInfo?.fskattPayer || false,
      contact_person: org.contactInfo?.name || '',
      business_description: org.businessActivity || '',
      business_category: org.primaryBusinessCategory?.description || '',
      legal_form: org.legalForm?.name || '',
      website: (org.urls || [])[0] || '',
      established_year: org.lifecycle?.establishedInYear || null,
      company_status: org.lifecycle?.status?.value || ''
    };

    return res.status(200).json({ success: true, data: transformedData });

  } catch (error) {
    console.error('Error checking org in DB:', error);
    return res.status(500).json({ success: false, message: 'Failed to check organization in database' });
  }
});


module.exports = {
    searchOrg,
    publicSearchOrg,
    getAll,
    getById,
    deleteById,
    refreshOrg,
    registerFullOrganization,
    updateFullOrganization,
    checkOrgExists

}
