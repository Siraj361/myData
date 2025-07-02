const db = require("../models/index.js");
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid'); // UUID for Sequelize

const Corp = db.corp;
const Role = db.roles;
const Permission = db.permissions;
const Resource = db.resources;
const User = db.users;

const createCorporation = async (req, res) => {
    try {
        const {
            corp_name,
            allowed_resources,
            admin_email,
            admin_password,
            admin_first_name,
            admin_last_name
        } = req.body;

        // Check if admin email already exists
        const existingUser = await User.findOne({ where: { email: admin_email } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'A user with this email already exists' });
        }

        // Get current user's corp and verify access
        const requestingUserCorp = await Corp.findByPk(req.user.corpId);
        const invalidResources = allowed_resources.filter(
            resId => !requestingUserCorp.allowedResources.includes(resId)
        );

        if (invalidResources.length > 0) {
            return res.status(403).json({ success: false, message: 'You cannot assign resources that your corporation does not have access to' });
        }

        // Create new corporation
        const newCorp = await Corp.create({
            corpName: corp_name,
            corpActive: true,
            allowedResources: allowed_resources
        });

        // Check or create Admin role for this corp
        let adminRole = await Role.findOne({ where: { corpId: newCorp.id, name: 'Admin', isSystem: true } });

        if (!adminRole) {
            adminRole = await Role.create({
                corpId: newCorp.id,
                name: 'Admin',
                description: `Corporation ${corp_name} administrator`,
                isSystem: true
            });
        }

        // Assign permissions for each resource
        for (const resourceId of allowed_resources) {
            await Permission.create({
                permissionId: uuidv4(),
                roleId: adminRole.id,
                resourceId: resourceId,
                canRead: true,
                canCreate: true,
                canUpdate: true,
                canDelete: true
            });
        }

        // Create admin user
        const hashedPassword = await bcrypt.hash(admin_password, 10);
        await User.create({
            corpId: newCorp.id,
            roleId: adminRole.id,
            first: admin_first_name,
            last: admin_last_name,
            email: admin_email,
            password: hashedPassword,
            type: 'Admin',
            active: true
        });

        res.status(201).json({ success: true, data: newCorp });

    } catch (error) {
        console.error('Error creating corporation:', error);
        res.status(500).json({ success: false, message: 'Error creating corporation' });
    }
};

const updateCorporation = async (req, res) => {
  const transaction = await Corp.sequelize.transaction();
  try {
    const { corp_id } = req.params;
    const {
      corp_name,
      allowed_resources,
      corp_active,
      street_address,
      registered_city,
      postal_code,
      city,
      company_email,
      company_phone,
    } = req.body;

    // Validate allowed_resources
    if (allowed_resources) {
      const requestingUserCorp = await Corp.findOne({
        where: { id: req.user.corpId },
      });

      const invalidResources = allowed_resources.filter(
        (resId) => !requestingUserCorp.allowed_resources.includes(resId)
      );

      if (invalidResources.length > 0) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message:
            "You cannot assign resources that your corporation does not have access to",
        });
      }
    }

    // Find and update corporation
    const corp = await Corp.findByPk(corp_id);
    if (!corp) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Corporation not found" });
    }

    await corp.update(
      {
        corp_name: corp_name || corp.corp_name,
        allowed_resources: allowed_resources || corp.allowed_resources,
        corp_active: corp_active !== undefined ? corp_active : corp.corp_active,
      },
      { transaction }
    );

    // Find or create org
    let org = await Org.findOne({ where: { corpId: corp_id }, transaction });
    if (!org) {
      org = await Org.create(
        {
          corpId: corp_id,
          legalId: corp_id,
          orgName: { name: corp_name },
          addresses: [
            {
              street: street_address,
              municipality: registered_city,
              zip: postal_code,
              city,
            },
          ],
          emails: [company_email],
          phones: [company_phone],
        },
        { transaction }
      );
    } else {
      await org.update(
        {
          orgName: { name: corp_name || org.orgName.name },
          addresses: [
            {
              street: street_address || org.addresses[0].street,
              municipality: registered_city || org.addresses[0].municipality,
              zip: postal_code || org.addresses[0].zip,
              city: city || org.addresses[0].city,
            },
          ],
          emails: [company_email || org.emails[0]],
          phones: [company_phone || org.phones[0]],
        },
        { transaction }
      );
    }

    await transaction.commit();

    res.json({
      success: true,
      data: {
        corporation: corp,
        organization: org,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating corporation:", error);
    res.status(500).json({
      success: false,
      message: "Error updating corporation",
      error: error.message,
    });
  }
};

const deleteCorporation = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { corp_id } = req.params;

        const corp = await Corp.findOne({ where: { corp_id }, transaction: t });
        if (!corp) {
            await t.rollback();
            return res.status(404).json({ success: false, message: "Corporation not found" });
        }

        const roles = await Role.findAll({ where: { corp_id }, transaction: t });
        const roleIds = roles.map(role => role.role_id);

        await Promise.all([
            Corp.destroy({ where: { corp_id }, transaction: t }),
            Org.destroy({ where: { corp_id }, transaction: t }),
            User.destroy({ where: { corp_id }, transaction: t }),
            Permission.destroy({ where: { role_id: { [Op.in]: roleIds } }, transaction: t }),
            Role.destroy({ where: { corp_id }, transaction: t }),
            Theme.destroy({ where: { corp_id }, transaction: t }),
            Vehicle.destroy({ where: { corp_id }, transaction: t })
        ]);

        await t.commit();
        res.json({ success: true, message: "Corporation and all related data have been deleted successfully" });
    } catch (error) {
        await t.rollback();
        console.error("Error deleting corporation:", error);
        res.status(500).json({ success: false, message: "Error deleting corporation", error: error.message });
    }
};

const getAllCorporations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
    const limit = parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 10;
    const offset = (page - 1) * limit;

    const searchTerm = req.query.search || '';
    const searchCondition = searchTerm ? {
      [db.Sequelize.Op.or]: [
        { corpName: { [db.Sequelize.Op.like]: `%${searchTerm}%` } },
        { '$Org.legalId$': { [db.Sequelize.Op.like]: `%${searchTerm}%` } }
      ]
    } : {};

    const { count: totalItems, rows: corporations } = await db.corp.findAndCountAll({
      where: searchCondition,
      include: [
        {
          model: db.org,
          as: 'Org',
          required: false
        }
      ],
      limit,
      offset
    });

    const totalPages = Math.ceil(totalItems / limit);

    const corporationsWithDetails = await Promise.all(
      corporations.map(async (corp) => {
        const org = corp.Org;

        const corpDetails = {
          ...corp.toJSON(),
          organization_number: org?.legalId || corp.id,
          street_address: org?.addresses?.[0]?.street || '',
          registered_city: org?.addresses?.[0]?.municipality || '',
          postal_code: org?.addresses?.[0]?.zip || '',
          city: org?.addresses?.[0]?.city || '',
          company_email: org?.emails?.[0] || '',
          company_phone: org?.phones?.[0] || '',
        };

        const resourceIds = corp.allowedResources || [];
        const resources = await db.resources.findAll({
          where: {
            resourceId: resourceIds
          },
          attributes: ['resourceId', 'title']
        });

        const allowed_resources_names = resources.map(resource => ({
          resource_id: resource.resourceId,
          title: resource.title
        }));

        return {
          ...corpDetails,
          allowed_resources: resourceIds,
          allowed_resources_names
        };
      })
    );

    res.json({
      success: true,
      data: corporationsWithDetails,
      totalItems,
      totalPages,
      currentPage: page,
      itemsPerPage: limit
    });
  } catch (error) {
    console.error('Error fetching corporations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching corporations'
    });
  }
};

const getUsersByCorporation = async (req, res) => {
  try {
    const { corp_id } = req.params;

    const users = await User.findAll({
      where: { corpId: corp_id },                // adjust attribute if needed
      include: [{
        model: Role,
        as: 'role',                                // use alias defined in associations
        attributes: ['id', 'name', 'description'] // include desired fields
      }],
      attributes: { exclude: ['password'] }       // don't return password
    });

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching corporation users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching corporation users',
      error: error.message
    });
  }
};

const getAllowedResources = async (req, res) => {
  try {
    const corp_id = req.user.corpId;

    const corporation = await Corp.findOne({ where: { id: corp_id } });

    if (!corporation) {
      return res.status(404).json({
        success: false,
        message: 'Corporation not found'
      });
    }

    // Fetch public resources only
    const resources = await Resource.findAll({
      where: { isPublic: true },
      attributes: ['resourceId', 'title', 'description', 'icon', 'route']
    });

    res.json({ success: true, data: resources });

  } catch (error) {
    console.error('Error fetching allowed resources:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching allowed resources',
      error: error.message
    });
  }
};

const getRolesByCorporation = async (req, res) => {
  try {
    const { corp_id } = req.params;

    const roles = await Role.findAll({
      where: { corpId: corp_id },
      attributes: ['roleId', 'corpId', 'name', 'description', 'isSystem', 'createdAt', 'updatedAt']
    });

    res.json({
      success: true,
      data: roles
    });

  } catch (error) {
    console.error('Error fetching corporation roles:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching corporation roles',
      error: error.message
    });
  }
};

const updateUserOfCorporation = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      first_name,
      last_name,
      email,
      type,
      role_id,
      active,
      corp_id
    } = req.body;

    // Find the user to update
    const user = await User.findOne({
      where: { id: userId, active: true }
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // If corp_id is provided, verify it exists
    if (corp_id) {
      const corporation = await Corp.findByPk(corp_id);
      if (!corporation) {
        return res.status(404).json({ success: false, message: 'Corporation not found' });
      }
    }

    // Check if email is changed and ensure uniqueness
    if (email && email.toLowerCase() !== user.email) {
      const emailExists = await User.findOne({ where: { email: email.toLowerCase() } });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'User with this email already exists' });
      }
    }

    // If role_id is provided, verify its validity within the corporation
    if (role_id) {
      const role = await Role.findOne({
        where: {
          id: role_id,
          corpId: corp_id || user.corpId
        }
      });
      if (!role) {
        return res.status(400).json({ success: false, message: 'Invalid role ID for the target corporation' });
      }
    }

    // Update user record
    const [rowsUpdated, [updatedUser]] = await User.update({
      first: first_name || user.first,
      last: last_name || user.last,
      email: email ? email.toLowerCase() : user.email,
      type: type || user.type,
      roleId: role_id !== undefined ? role_id : user.roleId,
      active: active !== undefined ? active : user.active,
      corpId: corp_id || user.corpId
    }, {
      where: { id: userId },
      returning: true
    });

    // Fetch role details if applicable
    const roleDetails = role_id
      ? await Role.findByPk(updatedUser.roleId, {
        attributes: ['id', 'name', 'description']
      })
      : null;

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: updatedUser.id,
        first_name: updatedUser.first,
        last_name: updatedUser.last,
        email: updatedUser.email,
        type: updatedUser.type,
        active: updatedUser.active,
        corp_id: updatedUser.corpId,
        role: roleDetails && {
          id: roleDetails.id,
          name: roleDetails.name,
          description: roleDetails.description
        }
      }
    });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: 'Failed to update user', error: error.message });
  }
};

const createUserInCorporation = async (req, res) => {
  try {
    const { corp_id, first_name, last_name, email, password, type = 'User', role_id } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email || !password || !corp_id) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    // Verify corporation exists
    const corporation = await Corp.findByPk(corp_id);
    if (!corporation) {
      return res.status(404).json({ success: false, message: 'Corporation not found' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    // If role_id is provided, verify it exists and belongs to the corporation
    if (role_id) {
      const role = await Role.findOne({ where: { id: role_id, corpId: corp_id } });
      if (!role) {
        return res.status(400).json({ success: false, message: 'Invalid role ID for the corporation' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await User.create({
      id: uuidv4(),
      corpId: corp_id,
      first: first_name,
      last: last_name,
      email: email.toLowerCase(),
      password: hashedPassword,
      type,
      active: true,
      roleId: role_id || null
    });

    // Fetch created user with role details
    const createdUser = await User.findByPk(newUser.id, {
      include: role_id ? [{ model: Role, attributes: ['id', 'name', 'description'] }] : []
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: createdUser.id,
        first_name: createdUser.first,
        last_name: createdUser.last,
        email: createdUser.email,
        type: createdUser.type,
        active: createdUser.active,
        corp_id: createdUser.corpId,
        role: createdUser.Role ? {
          id: createdUser.Role.id,
          name: createdUser.Role.name,
          description: createdUser.Role.description
        } : null
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, message: 'Failed to create user', error: error.message });
  }
};

const getFullCorporationDetails = async (req, res) => {
  try {
    const { corp_id } = req.params;

    // Find corporation
    const corporation = await Corp.findOne({ where: { id: corp_id } });
    if (!corporation) {
      return res.status(404).json({
        success: false,
        message: 'Corporation not found'
      });
    }

    // Find associated organization
    const organization = await Org.findOne({ where: { corpId: corp_id } });

    // Get resources details
    const resources = await Resource.findAll({
      where: {
        resourceId: corporation.allowedResources
      },
      attributes: ['resourceId', 'title', 'description', 'icon']
    });

    const allowed_resources_names = resources.map(resource => ({
      resource_id: resource.resourceId,
      title: resource.title,
      description: resource.description,
      icon: resource.icon
    }));

    if (!organization) {
      return res.json({
        success: true,
        data: {
          corporation: {
            ...corporation.toJSON(),
            allowed_resources_names
          },
          organization: null,
          warning: 'No organization details found for this corporation'
        }
      });
    }

    // Transform organization data
    const transformedOrg = {
      organization_number: organization.legalId,
      corp_name: organization.orgName || corporation.corpName,
      street_address: organization.street || '',
      registered_city: organization.registeredCity || '',
      postal_code: organization.postalCode || '',
      city: organization.city || '',
      company_email: organization.companyEmail || '',
      company_phone: organization.companyPhone || '',

      contact_person: '',
      business_description: '',
      business_category: '',
      legal_form: '',
      vat_number: '',
      website: '',
      is_f_skatt_payer: false,
      established_year: null,
      company_status: ''
    };

    res.json({
      success: true,
      data: {
        corporation: {
          ...corporation.toJSON(),
          allowed_resources_names
        },
        organization: transformedOrg
      }
    });

  } catch (error) {
    console.error('Error fetching full corporation details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching full corporation details'
    });
  }
};




module.exports = {
createCorporation,
updateCorporation,
deleteCorporation,
getAllCorporations,
getUsersByCorporation,
getAllowedResources,
getRolesByCorporation,
updateUserOfCorporation,
createUserInCorporation,
getFullCorporationDetails
    };
