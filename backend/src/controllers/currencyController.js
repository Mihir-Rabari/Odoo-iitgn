import { getAllCountries, getExchangeRates } from '../services/currencyService.js';

// Get all countries with currencies
export const getCountries = async (req, res) => {
  const countries = await getAllCountries();

  res.json({
    success: true,
    data: countries
  });
};

// Get exchange rates
export const getExchangeRatesController = async (req, res) => {
  const { base } = req.query;
  
  if (!base) {
    return res.status(400).json({
      success: false,
      message: 'Base currency is required'
    });
  }

  const rates = await getExchangeRates(base);

  res.json({
    success: true,
    data: rates
  });
};

export default {
  getCountries,
  getExchangeRatesController
};
