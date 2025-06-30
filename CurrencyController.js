const db = require("../../Models");

const currency = db.currency;


const getAllCurrency = async (req, res) => {

    try {

        const getCurrency = await currency.findAll();
        res.status(200).json({ message: "Currency fetched Successfully", getCurrency });

    } catch (error) {
        console.error("Error creating subcategory:", error);
        res.status(500).json({ message: 'Error getting Currency', error: error.message });
    }

}





module.exports = {
    getAllCurrency
}