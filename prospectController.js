const db = require("../models/index.js")


const prospect =db.prospectingList;
// Create a new prospecting list
const createProspectingList = async (req, res) => {
  try {
    const { listName, business, industries , datum} = req.body;

    const newList = await prospect.create({
      listName,
      business,
      industries,
      datum: datum || new Date(), 
      
    });

    return res.status(201).json({ success: true, data: newList });
  } catch (error) {
    console.error("Error creating prospecting list:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all prospecting lists
const getAllProspectingLists = async (req, res) => {
  try {
    const lists = await prospect.findAll();
    return res.status(200).json({ success: true, data: lists });
  } catch (error) {
    console.error("Error fetching prospecting lists:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get a specific prospecting list by ID
const getProspectingListById = async (req, res) => {
  try {
    const { id } = req.params;
    const list = await prospect.findByPk(id);

    if (!list) {
      return res.status(404).json({ success: false, message: "List not found" });
    }

    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    console.error("Error fetching prospecting list by ID:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete a prospecting list by ID
const deleteProspectingList = async (req, res) => {
  try {
    const { id } = req.params;
    const list = await prospect.findByPk(id);

    if (!list) {
      return res.status(404).json({ success: false, message: "List not found" });
    }

    await list.destroy();
    return res.status(200).json({ success: true, message: "List deleted successfully" });
  } catch (error) {
    console.error("Error deleting prospecting list:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  createProspectingList,
  getAllProspectingLists,
  getProspectingListById,
  deleteProspectingList,
};
