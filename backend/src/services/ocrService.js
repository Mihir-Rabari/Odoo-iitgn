import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import { logger } from '../utils/logger.js';
import fs from 'fs';

// Extract text from image using OCR
export const extractTextFromImage = async (imagePath) => {
  let worker;
  try {
    // Preprocess image for better OCR results
    const processedImagePath = `${imagePath}_processed.jpg`;
    await sharp(imagePath)
      .grayscale()
      .normalize()
      .sharpen()
      .toFile(processedImagePath);

    // Initialize Tesseract worker
    worker = await createWorker('eng');
    
    const { data: { text } } = await worker.recognize(processedImagePath);
    
    // Clean up processed image
    fs.unlinkSync(processedImagePath);
    
    await worker.terminate();
    
    return text;
  } catch (error) {
    if (worker) await worker.terminate();
    logger.error('OCR extraction failed:', error);
    throw error;
  }
};

// Parse expense details from OCR text
export const parseExpenseFromText = (text) => {
  try {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const expenseData = {
      amount: null,
      currency: null,
      date: null,
      merchantName: null,
      description: null
    };

    // Extract amount and currency
    const amountPattern = /(\$|€|£|₹|USD|EUR|GBP|INR)?\s*(\d+[.,]\d{2})\s*(\$|€|£|₹|USD|EUR|GBP|INR)?/i;
    for (const line of lines) {
      const match = line.match(amountPattern);
      if (match) {
        expenseData.amount = parseFloat(match[2].replace(',', '.'));
        const currencySymbol = match[1] || match[3];
        expenseData.currency = mapCurrencySymbol(currencySymbol);
        break;
      }
    }

    // Extract date
    const datePatterns = [
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
      /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/,
      /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i
    ];
    
    for (const line of lines) {
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          expenseData.date = parseDate(match[1]);
          break;
        }
      }
      if (expenseData.date) break;
    }

    // Extract merchant name (usually first few lines)
    if (lines.length > 0) {
      expenseData.merchantName = lines[0].substring(0, 100);
    }

    // Extract description (combine relevant lines)
    const descriptionLines = lines.slice(0, 3).join(' ');
    expenseData.description = descriptionLines.substring(0, 200);

    return expenseData;
  } catch (error) {
    logger.error('Failed to parse expense from text:', error);
    throw error;
  }
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
