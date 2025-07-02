const db = require('../models/index.js'); // Sequelize models
const User = db.users;
const Role = db.roles;
const Permission = db.permissions;
const Resource = db.resources;
const Corp = db.corp;


const getUserPermissions = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findOne({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const role = await Role.findOne({ where: { roleId: user.role_id } });
        if (!role) {
            return res.status(404).json({ message: 'User role not found' });
        }

        const permissions = await Permission.findAll({ where: { roleId: role.roleId } });

        const resourceIds = permissions.map(p => p.resourceId);
        const resources = await Resource.findAll({
            where: { resourceId: resourceIds }
        });

        const resourceMap = resources.reduce((acc, resource) => {
            acc[resource.resourceId] = resource;
            return acc;
        }, {});

        const corporation = await Corp.findOne({ where: { corpId: user.corpId } });
        if (!corporation) {
            return res.status(404).json({ message: 'Corporation not found' });
        }

        const filteredPermissions = permissions.filter(permission => {
            const resource = resourceMap[permission.resourceId];
            return resource && corporation.allowedResources.includes(resource.resourceId);
        });

        const formattedResources = filteredPermissions.map(permission => {
            const resource = resourceMap[permission.resourceId];
            if (!resource) return null;

            const subresourcePermissions = resource.hasSubresources ?
                resource.subresources.map(sub => {
                    const subPerm = permission.subresourcePermissions?.find(
                        sp => sp.subresourceRoute === sub.route
                    ) || {
                        can_read: false,
                        can_create: false,
                        can_update: false,
                        can_delete: false
                    };
                    return {
                        resource_id: sub._id,
                        title: sub.title,
                        route: sub.route,
                        icon: sub.icon,
                        position: resource.position,
                        permissions: {
                            can_read: subPerm.can_read,
                            can_create: subPerm.can_create,
                            can_update: subPerm.can_update,
                            can_delete: subPerm.can_delete
                        }
                    };
                }) : [];

            return {
                resource_id: resource.resourceId,
                title: resource.title,
                route: resource.route,
                icon: resource.icon,
                position: resource.position,
                has_subresources: resource.hasSubresources || false,
                subresources: subresourcePermissions,
                permissions: {
                    can_read: permission.can_read,
                    can_create: permission.can_create,
                    can_update: permission.can_update,
                    can_delete: permission.can_delete
                }
            };
        }).filter(Boolean);

        const resourcesObject = {};
        formattedResources.forEach(resource => {
            resourcesObject[resource.resource_id] = resource;
        });

        const formattedData = {
            role: {
                role_id: role.roleId,
                name: role.name,
                description: role.description
            },
            resources: resourcesObject
        };

        res.status(200).json({ success: true, data: formattedData });

    } catch (error) {
        console.error('Error fetching user permissions:', error);
        res.status(500).json({ message: 'Error fetching user permissions' });
    }
};
const getAllRoles = async (req, res) => {
    try {
        const corpId = req.user.corp_id;

        // Get all roles for the corporation
        const roles = await Role.findAll({ where: { corpId } });

        const roleIds = roles.map(role => role.roleId);
        const permissions = await Permission.findAll({
            where: { roleId: roleIds }
        });

        const resourceIds = permissions.map(p => p.resourceId);
        const resources = await Resource.findAll({
            where: {
                isPublic: true,
                resourceId: resourceIds
            }
        });

        const resourceMap = resources.reduce((acc, resource) => {
            acc[resource.resourceId] = resource;
            return acc;
        }, {});

        const permissionMap = permissions.reduce((acc, permission) => {
            if (!acc[permission.roleId]) {
                acc[permission.roleId] = [];
            }
            acc[permission.roleId].push(permission);
            return acc;
        }, {});

        const formattedRoles = roles.map(role => {
            const rolePermissions = permissionMap[role.roleId] || [];

            const permissions = rolePermissions.reduce((acc, permission) => {
                const resource = resourceMap[permission.resourceId];
                if (!resource) return acc;

                const subresourcePermissions = resource.hasSubresources ?
                    resource.subresources.map(sub => {
                        const subPerm = permission.subresourcePermissions?.find(
                            sp => sp.subresourceRoute === sub.route
                        ) || {
                            can_read: false,
                            can_create: false,
                            can_update: false,
                            can_delete: false
                        };

                        return {
                            resource_id: sub._id,
                            title: sub.title,
                            route: sub.route,
                            icon: sub.icon,
                            position: resource.position,
                            permissions: {
                                can_read: subPerm.can_read,
                                can_create: subPerm.can_create,
                                can_update: subPerm.can_update,
                                can_delete: subPerm.can_delete
                            }
                        };
                    }) : [];

                if (!acc[resource.resourceId]) {
                    acc[resource.resourceId] = {
                        resource_id: resource.resourceId,
                        title: resource.title,
                        route: resource.route,
                        icon: resource.icon,
                        position: resource.position,
                        has_subresources: resource.hasSubresources || false,
                        subresources: subresourcePermissions,
                        permissions: {
                            can_read: permission.can_read,
                            can_create: permission.can_create,
                            can_update: permission.can_update,
                            can_delete: permission.can_delete
                        }
                    };
                }

                return acc;
            }, {});

            return {
                role_id: role.roleId,
                name: role.name,
                description: role.description,
                is_system: role.isSystem,
                permissions,
                permissionsCount: Object.keys(permissions).length
            };
        });

        res.status(200).json({
            success: true,
            data: formattedRoles
        });

    } catch (error) {
        console.error('Error getting roles:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting roles',
            error: error.message
        });
    }
};

const createRole = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.id;

    // Load user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Fetch user's corporation
    const corporation = await Corp.findByPk(user.corpId);
    if (!corporation) {
      return res.status(404).json({ success: false, message: 'Corporation not found' });
    }

    // Create new role
    const role = await Role.create({
      roleId: uuidv4(),
      name,
      description,
      isSystem: false,
      corpId: corporation.id
    });

    // Fetch allowed resources from this corporation
    const allowedResources = await Resource.findAll({
      where: {
        resourceId: corporation.allowedResources
      }
    });

    // Create default permissions, all false
    const permissionPromises = allowedResources.map(resource =>
      Permission.create({
        permissionId: uuidv4(),
        roleId: role.id,
        resourceId: resource.id,
        canRead: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false
      })
    );
    const permissions = await Promise.all(permissionPromises);

    res.status(201).json({
      success: true,
      data: { role, permissions }
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating role',
      error: error.message
    });
  }
};
const updateRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { name, description } = req.body;

    const role = await Role.findOne({ where: { roleId } });
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    if (role.isSystem) {
      return res.status(403).json({
        success: false,
        message: 'System roles cannot be modified'
      });
    }

    role.name = name;
    role.description = description;
    await role.save();

    res.status(200).json({
      success: true,
      data: role
    });

  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating role',
      error: error.message
    });
  }
};

const deleteRole = async (req, res) => {
  try {
    const { roleId } = req.params;

    const role = await Role.findOne({ where: { roleId } });
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    if (role.isSystem) {
      return res.status(403).json({
        success: false,
        message: 'System roles cannot be deleted'
      });
    }

    await Role.destroy({ where: { roleId } });

    res.status(200).json({
      success: true,
      message: 'Role deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting role',
      error: error.message
    });
  }
};
const assignPermissions = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { permissions } = req.body;

    const role = await Role.findOne({ where: { roleId } });
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    if (role.isSystem) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify permissions for system roles'
      });
    }

    // Delete existing permissions for this role
    await Permission.destroy({ where: { roleId } });

    // Create new permissions
    const newPermissions = await Promise.all(
      permissions.map(async (permission) => {
        const permissionId = generateId('PERM');
        return await Permission.create({
          permissionId,
          roleId,
          resourceId: permission.resource_id,
          canRead: permission.can_read,
          canCreate: permission.can_create,
          canUpdate: permission.can_update,
          canDelete: permission.can_delete
        });
      })
    );

    res.status(201).json({
      success: true,
      data: newPermissions
    });

  } catch (error) {
    console.error('Error assigning permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning permissions',
      error: error.message
    });
  }
};
// adjust according to your setup

const updateRolePermissions =(async (req, res) => {
  const { roleId } = req.params;
  const { permissions } = req.body;

  // Ensure the role exists
  const role = await Role.findOne({ where: { roleId } });
  if (!role) {
    return res.status(404).json({ success: false, message: 'Role not found' });
  }

  if (role.isSystem) {
    return res.status(403).json({ success: false, message: 'Cannot modify system role permissions' });
  }

  // Process each incoming permission
  const updates = await Promise.all(permissions.map(async perm => {
    const resource = await Resource.findOne({ where: { resourceId: perm.resource_id } });
    const subPerms = (resource && resource.hasSubresources && resource.subresources) ?
      resource.subresources.map(sub => {
        const found = perm.subresources?.find(sp => sp.route === sub.route) || {};
        return {
          subresource_route: sub.route,
          can_read: found.can_read || false,
          can_create: found.can_create || false,
          can_update: found.can_update || false,
          can_delete: found.can_delete || false
        };
      })
      : [];

    const [existing] = await Permission.findOrCreate({
      where: { roleId, resourceId: perm.resource_id },
      defaults: {
        permissionId: generateId('PERM'),
        canRead: perm.can_read,
        canCreate: perm.can_create,
        canUpdate: perm.can_update,
        canDelete: perm.can_delete,
        subresourcePermissions: subPerms
      }
    });

    if (existing && existing.resourceId === perm.resource_id) {
      await Permission.update({
        canRead: perm.can_read,
        canCreate: perm.can_create,
        canUpdate: perm.can_update,
        canDelete: perm.can_delete,
        subresourcePermissions: subPerms
      }, { where: { roleId, resourceId: perm.resource_id } });
    }

    return perm;
  }));

  // Retrieve updated role and its permissions
  const updatedRole = await Role.findOne({ where: { roleId } });
  const updatedPermissions = await Permission.findAll({ where: { roleId } });
  const resourceIds = updatedPermissions.map(p => p.resourceId);
  const resources = await Resource.findAll({ where: { resourceId: resourceIds } });
  const resourceMap = resources.reduce((m, r) => {
    m[r.resourceId] = r;
    return m;
  }, {});

  const formatted = updatedPermissions.map(p => {
    const resrc = resourceMap[p.resourceId];
    const sub = resrc?.hasSubresources ? resrc.subresources.map(sub => {
      const sp = p.subresourcePermissions.find(x => x.subresource_route === sub.route) || {};
      return {
        ...sub,
        permissions: {
          can_read: sp.can_read || false,
          can_create: sp.can_create || false,
          can_update: sp.can_update || false,
          can_delete: sp.can_delete || false
        }
      };
    }) : [];

    return {
      resource: {
        _id: resrc.resourceId,
        title: resrc.title,
        description: resrc.description,
        icon: resrc.icon,
        has_subresources: resrc.hasSubresources,
        subresources: sub
      },
      view: p.canRead,
      add: p.canCreate,
      edit: p.canUpdate,
      delete: p.canDelete
    };
  });

  res.status(200).json({
    success: true,
    message: 'Permissions updated successfully',
    data: {
      role_id: updatedRole.roleId,
      name: updatedRole.name,
      description: updatedRole.description,
      permissions: formatted,
      permissionsCount: formatted.length
    }
  });
});


module.exports = {
 getUserPermissions,
    getAllRoles,
    createRole,
    updateRole,
    deleteRole,
    assignPermissions,
    updateRolePermissions
  
}