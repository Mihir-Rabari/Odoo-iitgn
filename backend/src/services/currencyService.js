import axios from 'axios';
import { config } from '../config/config.js';
import { cacheGet, cacheSet } from '../database/redis.js';
import { logger } from '../utils/logger.js';

// Get all countries with their currencies
export const getAllCountries = async () => {
  try {
    const cacheKey = 'countries:all';
    const cached = await cacheGet(cacheKey);
    
    if (cached) {
      return cached;
    }

    const response = await axios.get(`${config.countriesApiUrl}?fields=name,currencies`);
    const countries = response.data.map(country => ({
      name: country.name.common,
      currencies: country.currencies ? Object.keys(country.currencies).map(code => ({
        code,
        name: country.currencies[code].name,
        symbol: country.currencies[code].symbol
      })) : []
    })).filter(c => c.currencies.length > 0);

    // Cache for 24 hours
    await cacheSet(cacheKey, countries, 86400);
    return countries;
  } catch (error) {
    logger.error('Failed to fetch countries:', error);
    throw error;
  }
};

// Get exchange rates for a base currency
export const getExchangeRates = async (baseCurrency) => {
  try {
    const cacheKey = `exchange_rates:${baseCurrency}`;
    const cached = await cacheGet(cacheKey);
    
    if (cached) {
      return cached;
    }

    const response = await axios.get(`${config.exchangeRateApiUrl}/${baseCurrency}`);
    const rates = {
      base: response.data.base,
      date: response.data.date,
      rates: response.data.rates
    };

    // Cache for 1 hour
    await cacheSet(cacheKey, rates, 3600);
    return rates;
  } catch (error) {
    logger.error(`Failed to fetch exchange rates for ${baseCurrency}:`, error);
    throw error;
  }
};

// Convert amount from one currency to another
export const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  try {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const rates = await getExchangeRates(fromCurrency);
    
    if (!rates.rates[toCurrency]) {
      throw new Error(`Exchange rate not found for ${toCurrency}`);
    }

    const convertedAmount = amount * rates.rates[toCurrency];
    return Math.round(convertedAmount * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    logger.error(`Currency conversion failed: ${amount} ${fromCurrency} to ${toCurrency}`, error);
    throw error;
  }
};

export default {
  getAllCountries,
  getExchangeRates,
  convertCurrency
};
