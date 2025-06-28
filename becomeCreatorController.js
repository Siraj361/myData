const db = require('../../Models');
const upload = require('../../includes/multer');
// const { uploadMedia } = require('../../includes/upload');
// const upload = require('../../includes/multer')
const { uploadMedia } = require('../../includes/upload');
const { uploadMultipleFields } = require('../../includes/uploadMultiples')
const {parseOrArray} = require('../../Helper//parseOrArray')
const User = db.users;
const becomeCreator = db.become_creator_request;

const makeCreator = async (req, res) => {
    try {
        // const userId = req.decodedToken.user_id;
        const userId = req.decodedToken.user_id;

        const user = await User.findOne({ where: { id: userId } });

        if (!user) {
            return res.status(400).json({ error: "User not found" });
        }

        if (user.is_creator) {
            return res.status(200).json({ message: "User is already a creator" });
        }

        await user.update({ is_creator: true });
        await becomeCreator.create({ userId: userId });

        return res.status(200).json({ message: "User is now a creator" });
    } catch (error) {
        console.error("Error making user a creator:", error);
        return res.status(500).json({ error: "Error making user a creator" });
    }
};

const addCreatorData = async (req, res) => {
    try {
        uploadMultipleFields(req, res, async (err) => {
            if (err) {
                console.error("Error uploading files:", err);
                return res.status(500).json({ error: "Error uploading files" });
            }
            try {
                const userId = req.decodedToken.user_id;
                const user = await User.findOne({ where: { id: userId, is_creator: true } });
                if (!user) {
                    return res.status(400).json({ error: "User is not a creator" });
                }

                let backgroundImageUrl = user.background_image;
                let profileImageUrl = user.profile_image;
                let existingFavouritePics = parseOrArray(user.favourite_Pics);

                // Handle background image upload
                if (req.files.background_image) {
                    const s3Url = await uploadMedia([{
                        filename: req.files.background_image[0].originalname,
                        data: req.files.background_image[0].buffer,
                        type: req.files.background_image[0].mimetype
                    }]);
                    backgroundImageUrl = s3Url[0];
                }

                // Handle profile image upload
                if (req.files.profile_image) {
                    const s3Url = await uploadMedia([{
                        filename: req.files.profile_image[0].originalname,
                        data: req.files.profile_image[0].buffer,
                        type: req.files.profile_image[0].mimetype
                    }]);
                    profileImageUrl = s3Url[0];
                }

                // Handle media files
                const mediaItems = [];
                if (req.files.files) {
                    for (const file of req.files.files) {
                        mediaItems.push({
                            filename: file.originalname,
                            data: file.buffer,
                            type: file.mimetype
                        });
                    }
                }

                const s3Urls = await uploadMedia(mediaItems);
                const newMediaObjects = s3Urls.map(url => ({ url }));
                const updatedFavouritePics = existingFavouritePics.concat(newMediaObjects);

                // Update user data
                await user.update({
                    background_image: backgroundImageUrl,
                    profile_image: profileImageUrl,
                    nickName: req.body.nickName || user.nickName,
                    description: req.body.description || user.description,
                    primary_Categories: req.body.primary_Categories || user.primary_Categories,
                    secondary_Categories: req.body.secondary_Categories || user.secondary_Categories,
                    tags: JSON.stringify(parseOrArray(req.body.tags || user.tags)), // Tags still handled as JSON
                    content_preferences: req.body.content_preferences || user.content_preferences,
                    instagram: req.body.instagram || user.instagram,
                    twitter: req.body.twitter || user.twitter,
                    amazon: req.body.amazon || user.amazon,
                    favourite_Pics: JSON.stringify(updatedFavouritePics),
                    Gender: req.body.Gender || user.Gender,
                    ethnicity: req.body.ethnicity || user.ethnicity,
                    age: req.body.age || user.age,
                    booty_size: req.body.booty_size || user.booty_size,
                    body_type: req.body.body_type || user.body_type,
                    eye_color: req.body.eye_color || user.eye_color,
                    hair_color: req.body.hair_color || user.hair_color,
                    Height: req.body.Height || user.Height,
                    Weight: req.body.Weight || user.Weight,
                    location: req.body.location || user.location,
                    Tatoos: req.body.Tatoos || user.Tatoos
                });

                const updatedUser = await User.findOne({ where: { id: userId } });

                res.status(200).json({
                    message: "Creator data updated successfully",
                    userData: {
                        ...updatedUser.dataValues,
                        favourite_Pics: parseOrArray(updatedUser.favourite_Pics) // Parse favourite_Pics for response
                    },
                });
            } catch (error) {
                console.error("Error updating creator data:", error);
                res.status(500).json({ error: "Error updating creator data" });
            }
        });
    } catch (error) {
        console.error("Unexpected error:", error);
        res.status(500).json({ error: "Unexpected error" });
    }
};

// Helper function to safely parse JSON or return an array
// function parseOrArray(data) {
//     try {
//         return JSON.parse(data || '[]');
//     } catch (e) {
//         console.error("Error parsing JSON:", e);
//         return [];
//     }
// }


const getAllCreator = async (req, res) => {
    try {
        const allCreators = await User.findAll({ where: { is_creator: true } });
        res.status(200).json(allCreators);
    } catch (error) {
        console.error("Error fetching all creators:", error);
        res.status(500).json({ error: "Error fetching all creators" });
    }
}


module.exports = {
    makeCreator,
    addCreatorData,
    getAllCreator
}