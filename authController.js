const db = require('../models/index.js');
const crypto = require("crypto");
const bcrypt = require("bcryptjs"); // Added bcrypt
const asyncHandler = require("express-async-handler");

const User = db.users;
const Corp = db.corp;
const Resource = db.resources;
const Theme = db.theme;
const DeviceVerification = db.deviceVerification; // Use consistent casing
const Org = db.org;
const Role = db.roles;
const Permission = db.permissions;

const { getOrgFromAPI } = require('../services/orgService');
const { generateTokens } = require("../utils/generateTokenUtil.js");
const { sendEmail } = require("../utils/sendEmailUtil.js");

// OTP Generator
const generateOTP = async (email) => {
  try {
    const otp = "123456";
    const emailContent = { userEmail: email, otp };
    console.log("Sending email to:", email);
    await sendEmail(email, "Your Verification Code", "otp", emailContent);
    return otp;
  } catch (error) {
    console.error("Error generating/sending OTP:", error);
    throw new Error("Failed to send verification email. Please try again later.");
  }
};

// Validate Required Fields
const validateRequiredFields = (data) => {
  const requiredFields = {
    'Organization Number': data.organization_number,
    'Corporation Name': data.corp_name,
    'Admin Email': data.admin_data?.email || data.email,
    'Admin Password': data.admin_data?.password || data.password,
    'Admin First Name': data.admin_data?.first_name || data.first_name,
    'Admin Last Name': data.admin_data?.last_name || data.last_name
  };
  return Object.entries(requiredFields)
    .filter(([_, value]) => !value)
    .map(([field]) => field);
};



//  const loginUser = asyncHandler(async (req, res) => {
//   try {
//     const { email, password, deviceId, deviceName } = req.body;
//     if (!deviceId) return res.status(400).json({ success: false, message: "Missing deviceId" });

//     const user = await User.findOne({ where: { email: email.toLowerCase(), active: true } });
//     if (!user) return res.status(401).json({ success: false, message: "Invalid email or password" });

//     const corp = await Corp.findOne({ where: { id: user.corpId, corpActive: true } });
//     if (!corp) return res.status(401).json({ success: false, message: "Invalid email or password" });

//     const isPasswordValid = await bcrypt.compare(password, user.password);
//     if (!isPasswordValid) return res.status(401).json({ success: false, message: "Invalid email or password" });

//     const deviceVerification = await DeviceVerification.findOne({
//       where: { userId: user.id, deviceId, isVerified: true }
//     });

//     if (deviceVerification) {
//       const { accessToken, refreshToken } = generateTokens(user);
//       await User.update({ lastNotificationsCheck: Math.floor(Date.now() / 1000) }, { where: { id: user.id } });

//       return res.status(200).json({
//         success: true,
//         message: "Login successful",
//         data: {
//           tokens: { accessToken, refreshToken },
//           user: {
//             id: user.id,
//             email: user.email,
//             first: user.first,
//             last: user.last,
//             type: user.type,
//             corp: {
//               corp_id: corp.id,
//               corp_name: corp.corpName
//             }
//           }
//         }
//       });
//     }

//     // ✅ Generate OTP and Send Email
//     const otp = await generateOTP(email);
//     const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

//     const [deviceVerificationRecord] = await DeviceVerification.findOrCreate({
//       where: { userId: user.id, deviceId },
//       defaults: { deviceName: deviceName || "Unknown Device", isVerified: false }
//     });

//     await deviceVerificationRecord.update({
//       otp,
//       otpExpiresAt,
//       lastOtpSentAt: new Date(),
//       otpAttempts: 0
//     });

//     // ✅ Send OTP Email
//     await sendEmail(
//       user.email,
//       'Your Verification Code',
//       'otp',
//       {
//         otp,
//         userEmail: user.email,
//         APP_NAME: process.env.APP_NAME || 'Leady'
//       }
//     );

//     console.log("OTP sent to:", user.email);
//     return res.status(200).json({ success: true, message: "OTP sent to your email", requiresVerification: true });

//   } catch (error) {
//     console.error("Login error:", error);
//     return res.status(500).json({ success: false, message: "Server error", error: error.message });
//   }
// });




const loginUser = asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase(), active: true } });
    if (!user) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const corp = await Corp.findOne({ where: { id: user.corpId, corpActive: true } });
    if (!corp) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const { accessToken, refreshToken } = generateTokens(user);
    await User.update({ lastNotificationsCheck: Math.floor(Date.now() / 1000) }, { where: { id: user.id } });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        tokens: { accessToken, refreshToken },
        user: {
          id: user.id,
          email: user.email,
          first: user.first,
          last: user.last,
          type: user.type,
          corp: {
            corp_id: corp.id,
            corp_name: corp.corpName
          }
        }
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// Signup Controller
const signUpUser = asyncHandler(async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const {
      organization_number, corp_name, street_address, registered_city,
      postal_code, city, company_email, company_phone,
      email, password, first_name, last_name, phone
    } = req.body;

    const missing = validateRequiredFields(req.body);
    if (missing.length) {
      await t.rollback();
      return res.status(400).json({ success: false, message: `Missing fields: ${missing.join(', ')}` });
    }

    if (await User.findOne({ where: { email: email.toLowerCase() }, transaction: t })) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    if (await Org.findOne({ where: { legalId: organization_number }, transaction: t })) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Organization already exists' });
    }

    const resources = await Resource.findAll({ where: { isPublic: true }, transaction: t });
    const allowedResources = resources.map(r => r.resourceId);

    const newCorp = await Corp.create({
      corpName: corp_name,
      corpActive: true,
      allowedResources
    }, { transaction: t });

    const adminRole = await Role.create({
      corpId: newCorp.id,
      name: "Admin",
      description: `Corporation ${corp_name} administrator`,
      isSystem: true
    }, { transaction: t });

    await Promise.all(resources.map(resource => {
      const subPerm = resource.hasSubresources && resource.subresources
        ? resource.subresources.map(s => ({
            subresource_route: s.route,
            can_read: true,
            can_create: true,
            can_update: true,
            can_delete: true
          }))
        : [];
      return Permission.create({
        permissionId: crypto.randomUUID(),
        roleId: adminRole.id,
        // resourceId: resource.resourceId,
        resourceId: resource.id,
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        subresourcePermissions: subPerm
      }, { transaction: t });
    }));

    const hashed = await bcrypt.hash(password, 10);
    const adminUser = await User.create({
      corpId: newCorp.id,
      corpName: corp_name,
      roleId: adminRole.id,
      first: first_name,
      last: last_name,
      email: email.toLowerCase(),
      password: hashed,
      phone,
      type: "Admin",
      active: true
    }, { transaction: t });

    const apiOrgData = await getOrgFromAPI(organization_number);
    if (!apiOrgData) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Organization not found via API" });
    }

    // Remove conflicting 'id' from apiOrgData
    // const { id, ...orgData } = apiOrgData;
    const { id, ...orgData } = apiOrgData || {};


    const newOrg = await Org.create({
      ...orgData,
      corpId: newCorp.id,
      userId: adminUser.id,
      legalId: organization_number,
      country: apiOrgData.country,
      street_address,
      registered_city,
      postal_code,
      city,
      company_email,
      company_phone
    }, { transaction: t });

    await t.commit();

    const { accessToken, refreshToken } = generateTokens(adminUser);
    return res.status(201).json({
      success: true,
      data: { corporation: newCorp, organization: newOrg, admin_user: adminUser, tokens: { accessToken, refreshToken } }
    });

  } catch (e) {
    await t.rollback();
    console.error("Signup error:", e);
    return res.status(500).json({ success: false, message: "Error creating organization", error: e.message });
  }
});




const tokenCheck = asyncHandler(async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(401).json({
        status: 401,
        isValid: false,
        message: "No token provided",
      });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const { email } = decodedToken;

    const user = await User.findOne({
      where: {
        email: email.toLowerCase(),
        active: true
      }
    });

    if (!user) {
      throw new Error("User has been deleted or not found");
    }

    return res.status(200).json({
      status: 200,
      isValid: true,
      message: "Valid Token",
    });
  } catch (error) {
    console.log("Token validation error:", error.message);
    return res.status(401).json({
      status: 401,
      isValid: false,
      message: error.name === "TokenExpiredError" ? "Token has expired" : "Invalid Token",
    });
  }
});
const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "first", "last", "email", "type", "active"],
      order: [
        ["first", "ASC"],
        ["last", "ASC"]
      ]
    });

    if (!users.length) {
      console.log(`WARNING! No users found. Returning 404.`);
      return res.status(404).json({ message: "No users found" });
    }

    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
});
const refreshUserToken = asyncHandler(async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(401).json({ success: false, message: "Refresh token is required" });
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findOne({
      where: { id: decoded.user_id, active: true },
      include: { model: Corp, where: { corpActive: true }, attributes: ['corpId', 'corpName'] }
    });

    if (!user || !user.Corp) {
      return res.status(401).json({ success: false, message: "Invalid refresh token" });
    }

    const tokens = generateTokens(user);
    return res.json({ success: true, tokens: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } });
  } catch (error) {
    console.error("Token refresh error:", error);
    return res.status(401).json({ success: false, message: "Invalid refresh token" });
  }
});
const getUserInfo = asyncHandler(async (req, res) => {
  try {
    const user = await User.findOne({ where: { id: req.user.id, active: true } });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const corp = await Corp.findOne({ where: { corpId: user.corpId, corpActive: true } });
    if (!corp) return res.status(404).json({ success: false, message: "Corporation not found" });

    const org = await Org.findOne({ where: { corpId: user.corpId, userId: user.id } });
    const theme = await Theme.findOne({ where: { corpId: user.corpId } });
    const themeData = theme?.theme || "#3b82f6";

    const logoUrl = corp.logo ? `${process.env.BACKEND_URL}/${corp.logo}` : null;

    const orgDetails = org ? {
      organization_number: org.legalId,
      organization_name: org.orgName.name || org.orgName.rawName,
      organization_email: org.emails?.[0] || null,
      organization_phone: org.phones?.[0] || null,
      business_category: org.primaryBusinessCategory.description,
      legal_form: org.legalForm.name
    } : null;

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first,
        last_name: user.last,
        type: user.type,
        corp: { corp_id: corp.corpId, corp_name: corp.corpName },
        organization: orgDetails,
        theme: themeData,
        logo: logoUrl
      }
    });
  } catch (error) {
    console.error("Get user info error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});
const verifyOTP = asyncHandler(async (req, res) => {
  try {
    const { email, otp, deviceId } = req.body;
    const user = await User.findOne({ where: { email: email.toLowerCase(), active: true } });
    if (!user) return res.status(401).json({ success: false, message: "Invalid email" });

    const dv = await DeviceVerification.findOne({ where: { userId: user.id, deviceId } });
    if (!dv) return res.status(400).json({ success: false, message: "Device verification record not found" });

    if (!dv.otpExpiresAt || new Date() > dv.otpExpiresAt) {
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
    }
    if (dv.otpAttempts >= 3) {
      return res.status(400).json({ success: false, message: "Too many failed attempts. Please request a new OTP." });
    }
    if (otp !== dv.otp) {
      await dv.increment('otpAttempts');
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    await dv.update({ isVerified: true, lastVerifiedAt: new Date(), otp: null, otpExpiresAt: null, otpAttempts: 0 });
    const tokens = generateTokens(user);
    await user.update({ lastNotificationsCheck: Math.floor(Date.now() / 1000) });

    return res.json({
      success: true,
      message: "OTP verified successfully",
      data: {
        tokens: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
        user: { id: user.id, email: user.email, first: user.first, last: user.last, type: user.type }
      }
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});
const resendOTP = asyncHandler(async (req, res) => {
  try {
    const { email, deviceId, deviceName } = req.body;
    const user = await User.findOne({ where: { email: email.toLowerCase(), active: true } });
    if (!user) return res.status(401).json({ success: false, message: "Invalid email" });

    const [dv] = await DeviceVerification.findOrCreate({
      where: { userId: user.id, deviceId },
      defaults: { deviceName: deviceName || "Unknown Device", isVerified: false }
    });

    const otp = await generateOTP(email);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await dv.update({ otp, otpExpiresAt, lastOtpSentAt: new Date(), otpAttempts: 0 });

    return res.json({ success: true, message: "New OTP sent to your email", requiresVerification: true });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});
const forgotPassword = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email: email.toLowerCase(), active: true } });
    if (!user) {
      return res.json({ success: true, message: "If an account exists with this email, you will receive password reset instructions." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000);

    await user.update({ resetToken, resetTokenExpires });

    const resetUrl = `${process.env.ADMIN_URL}/reset-password?token=${resetToken}`;
    await sendEmail(email, "Password Reset Request", "password-reset", { userEmail: email, resetUrl, userName: `${user.first} ${user.last}` });

    return res.json({ success: true, message: "If an account exists with this email, you will receive password reset instructions." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});
const resetPassword = asyncHandler(async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({ where: { resetToken: token, resetTokenExpires: { [Op.gt]: new Date() }, active: true } });
    if (!user) return res.status(400).json({ success: false, message: "Invalid or expired reset token" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await user.update({ password: hashedPassword, resetToken: null, resetTokenExpires: null });

    return res.json({ success: true, message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});
const changePassword = asyncHandler(async (req, res) => {
  try {
    const user = await User.findOne({ where: { id: req.user.id, active: true } });
    if (!user) return res.status(401).json({ success: false, message: "User not found" });

    const isValid = await bcrypt.compare(req.body.currentPassword, user.password);
    if (!isValid) return res.status(400).json({ success: false, message: "Invalid old password" });

    const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
    await user.update({ password: hashedPassword });

    return res.json({ success: true, message: "Password has been changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});


module.exports = {
  generateOTP,
  loginUser,
  signUpUser,
  tokenCheck,
getAllUsers,
refreshUserToken,
getUserInfo,
verifyOTP,
resendOTP,
forgotPassword,
resetPassword,
changePassword

};
