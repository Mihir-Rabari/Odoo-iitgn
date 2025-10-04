import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';
import { logger } from '../utils/logger.js';
import { config } from '../config/config.js';
import fs from 'fs';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(config.geminiApiKey || process.env.GEMINI_API_KEY);

// Extract expense details from receipt using Gemini AI
export const extractTextFromImage = async (imagePath) => {
  try {
    // Read and convert image to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Initialize Gemini model (gemini-1.5-flash for fast processing)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
Analyze this receipt image and extract the following information in JSON format:
{
  "amount": <number, total amount on receipt>,
  "currency": <string, currency code like USD, EUR, GBP, INR>,
  "date": <string, date in YYYY-MM-DD format>,
  "merchantName": <string, business/merchant name>,
  "description": <string, brief description of the expense>,
  "items": [<array of items purchased, if visible>],
  "category": <string, suggested expense category: Food, Transportation, Accommodation, Office Supplies, Entertainment, Miscellaneous>
}

Rules:
- Return ONLY valid JSON, no additional text
- If any field is not found, use null
- Format date as YYYY-MM-DD
- Currency should be 3-letter code (USD, EUR, etc.)
- Amount should be the total/final amount (after tax)
- Description should be concise (max 200 chars)
- Be accurate and extract exact values from the receipt
`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Image
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    
    logger.info('Gemini OCR response:', text);

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Gemini response');
    }

    const expenseData = JSON.parse(jsonMatch[0]);
    
    return expenseData;
  } catch (error) {
    logger.error('Gemini OCR extraction failed:', error);
    throw error;
  }
};

// Legacy function for backward compatibility
export const parseExpenseFromText = (text) => {
  // This is now handled by Gemini AI directly
  // Keeping for backward compatibility
  return text;
};

// Map currency symbols to currency codes
const mapCurrencySymbol = (symbol) => {
  const currencyMap = {
    '$': 'USD',
    'USD': 'USD',
    '€': 'EUR',
    'EUR': 'EUR',
    '£': 'GBP',
    'GBP': 'GBP',
    '₹': 'INR',
    'INR': 'INR'
  };
  
  return currencyMap[symbol?.toUpperCase()] || 'USD';
};

// Parse date from various formats
const parseDate = (dateStr) => {
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    return null;
  } catch {
    return null;
  }
};

export default {
  extractTextFromImage,
  parseExpenseFromText
};
