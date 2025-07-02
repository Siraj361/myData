const db = require('../models');
const Theme = db.theme;
const Corp =db.corp;
const fs = require('fs').promises;
const fsSync = require('fs');  // Add this for sync operations
const path = require('path');

// Helper function to validate hex color
const isValidHexColor = (color) => {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexColorRegex.test(color);
};

// Helper function to check admin status
const isAdmin = (userType) => {
    return userType === 'Super Admin' || userType === 'Admin';
};

// Helper function to get full logo URL
const getFullLogoUrl = (relativePath) => {
    if (!relativePath) return null;
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    return `${backendUrl}/${relativePath}`;
};

const getTheme = (async (req, res) => {
    try {
        const { corp_id } = req.user;

        let color = await Theme.findOne({ where: { corp_id } });

        if (!color) {
            // If no theme exists, create default
            color = await Theme.create({
                corp_id,
                theme: '#3b82f6',
                updated_by: req.user.id
            });
        }

        res.status(200).json({
            success: true,
            theme: color.theme
        });

    } catch (error) {
        console.error('Get theme error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});
const updateTheme = (async (req, res) => {
    try {
        const { corp_id, type } = req.user;
        const { color } = req.body;

        // Check if user is admin of the corporation
        if (type !== 'Super Admin' && type !== 'Admin') {
            return res.status(403).json({
                success: false,
                message: 'Only corporation admins can update theme'
            });
        }

        // Validate color input
        if (!color) {
            return res.status(400).json({
                success: false,
                message: 'Theme color is required'
            });
        }

        // Validate hex color format
        if (!isValidHexColor(color)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid color format. Please provide a valid hex color (e.g., #3b82f6)'
            });
        }

        // Check for existing theme
        let theme = await Theme.findOne({ where: { corp_id } });

        if (theme) {
            // Update existing theme
            theme.theme = color;
            theme.updated_by = req.user.id;
            theme.updated_at = new Date();
            await theme.save();
        } else {
            // Create new theme
            theme = await Theme.create({
                corp_id,
                theme: color,
                updated_by: req.user.id
            });
        }

        res.status(200).json({
            success: true,
            theme: theme.theme,
            message: 'Theme updated successfully'
        });

    } catch (error) {
        console.error('Update theme error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});
const getLogo =(async (req, res) => {
    try {
        const { corp_id } = req.user;

        const corp = await Corp.findOne({ where: { corp_id } });

        if (!corp) {
            return res.status(404).json({
                success: false,
                message: 'Corporation not found'
            });
        }

        if (!corp.logo) {
            return res.status(200).json({
                success: true,
                logo: null
            });
        }

        const logoPath = path.join(process.cwd(), corp.logo);

        if (!fsSync.existsSync(logoPath)) {
            // Clear logo if file doesn't exist
            corp.logo = null;
            await corp.save();

            return res.status(200).json({
                success: true,
                logo: null
            });
        }

        const relativePath = path.relative(process.cwd(), corp.logo);
        res.status(200).json({
            success: true,
            logo: getFullLogoUrl(relativePath)
        });

    } catch (error) {
        console.error('Get logo error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});
const updateLogo = (async (req, res) => {
    try {
        const { corp_id, type } = req.user;

        if (!isAdmin(type)) {
            return res.status(403).json({
                success: false,
                message: 'Only corporation admins can update logo'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No logo file provided'
            });
        }

        const corp = await Corp.findOne({ where: { corp_id } });

        if (!corp) {
            await fs.unlink(req.file.path);
            return res.status(404).json({
                success: false,
                message: 'Corporation not found'
            });
        }

        if (corp.logo) {
            const oldLogoPath = path.join(process.cwd(), corp.logo);
            try {
                if (fsSync.existsSync(oldLogoPath)) {
                    await fs.unlink(oldLogoPath);
                }
            } catch (error) {
                console.error('Error deleting old logo:', error);
            }
        }

        const relativePath = path.relative(process.cwd(), req.file.path);
        corp.logo = relativePath;
        await corp.save();

        res.status(200).json({
            success: true,
            logo: getFullLogoUrl(relativePath),
            message: 'Logo updated successfully'
        });

    } catch (error) {
        console.error('Update logo error:', error);
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Error cleaning up file:', unlinkError);
            }
        }
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});
const removeLogo = (async (req, res) => {
    try {
        const { corp_id, type } = req.user;

        if (!isAdmin(type)) {
            return res.status(403).json({
                success: false,
                message: 'Only corporation admins can remove logo'
            });
        }

        const corp = await Corp.findOne({ where: { corp_id } });

        if (!corp) {
            return res.status(404).json({
                success: false,
                message: 'Corporation not found'
            });
        }

        if (corp.logo) {
            const logoPath = path.join(process.cwd(), corp.logo);
            try {
                if (fsSync.existsSync(logoPath)) {
                    await fs.unlink(logoPath);
                }
            } catch (error) {
                console.error('Error deleting logo file:', error);
            }
        }

        corp.logo = null;
        await corp.save();

        res.status(200).json({
            success: true,
            message: 'Logo removed successfully'
        });

    } catch (error) {
        console.error('Remove logo error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});


module.exports = {
    getTheme,
    updateTheme,
    getLogo,
    updateLogo,
    removeLogo
}