const asyncHandler = require('express-async-handler');
const axios = require('axios');

// @desc    Scrape companies from Allabolag API
// @route   POST /api/scrape/companies
// @access  Private (requires COMPANIES create permission)
const scrapeCompanies = asyncHandler(async (req, res) => {
  console.log('🚀 Starting company scraping process...');

  try {
    const response = await axios.post('http://localhost:3002/start-scraping');

    return res.status(200).json({
      success: true,
      message: 'Company scraping process started successfully',
      data: {
        workersCount: response.data.workersCount,
        status: 'running',
        statusEndpoint: 'http://localhost:3002/scraping-status'
      }
    });
  } catch (error) {
    console.error('❌ Error in scraping process:', error);
    return res.status(500).json({
      success: false,
      message: 'Error occurred while starting company scraping',
      error: error.message
    });
  }
});

// @desc    Get scraping status
// @route   GET /api/scrape/status
// @access  Private

const getScrapingStatus = asyncHandler(async (req, res) => {
  try {
    const response = await axios.get('http://localhost:3002/scraping-status');
    return res.status(200).json(response.data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error getting scraping status',
      error: error.message
    });
  }
});

module.exports = {
  scrapeCompanies,
  getScrapingStatus
};
