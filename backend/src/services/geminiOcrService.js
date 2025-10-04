import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import { config } from '../config/config.js';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(config.geminiApiKey || process.env.GEMINI_API_KEY);

/**
 * Extract expense data from receipt image using Gemini Vision API
 * @param {string} imagePath - Path to the receipt image
 * @returns {Promise<Object>} - Extracted expense data with structured JSON
 */
export const extractExpenseFromReceipt = async (imagePath) => {
  try {
    // Read image file
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Use Gemini Pro Vision model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an expert at extracting structured data from receipt images.
    
Analyze this receipt image and extract the following information in valid JSON format:

{
  "amount": <number or null>,
  "currency": "<3-letter currency code or null>",
  "date": "<YYYY-MM-DD format or null>",
  "merchantName": "<merchant/vendor name or null>",
  "description": "<brief description of the expense or null>",
  "category": "<expense category: Food, Transportation, Accommodation, Office Supplies, Entertainment, or Miscellaneous>",
  "items": [
    {
      "name": "<item name>",
      "quantity": <number>,
      "price": <number>
    }
  ],
  "paymentMethod": "<Cash, Credit Card, Debit Card, or null>",
  "taxAmount": <number or null>,
  "confidence": <number 0-100>
}

IMPORTANT RULES:
- Amount should be the TOTAL amount (including tax)
- Currency should be ISO 4217 code (USD, EUR, GBP, INR, etc.)
- Date must be in YYYY-MM-DD format
- If you cannot extract a field with confidence, set it to null
- Confidence should be 0-100 indicating how confident you are
- Return ONLY valid JSON, no markdown or explanations
- Category should be one of: Food, Transportation, Accommodation, Office Supplies, Entertainment, Miscellaneous

Receipt Image:`;

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

    // Parse JSON from response (remove markdown code blocks if present)
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const expenseData = JSON.parse(jsonText);

    logger.info('Gemini OCR extraction successful', { 
      confidence: expenseData.confidence,
      amount: expenseData.amount,
      merchant: expenseData.merchantName
    });

    return {
      success: true,
      data: expenseData,
      rawResponse: text
    };

  } catch (error) {
    logger.error('Gemini OCR extraction failed:', error);
    throw new Error(`Failed to extract expense data: ${error.message}`);
  }
};

/**
 * Validate extracted expense data
 * @param {Object} expenseData - Extracted expense data
 * @returns {Object} - Validation result
 */
export const validateExpenseData = (expenseData) => {
  const errors = [];
  
  if (!expenseData.amount || expenseData.amount <= 0) {
    errors.push('Invalid or missing amount');
  }
  
  if (!expenseData.currency || expenseData.currency.length !== 3) {
    errors.push('Invalid or missing currency code');
  }
  
  if (!expenseData.date) {
    errors.push('Missing date');
  }
  
  if (expenseData.confidence < 50) {
    errors.push('Low confidence in extraction (< 50%)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export default {
  extractExpenseFromReceipt,
  validateExpenseData
};
