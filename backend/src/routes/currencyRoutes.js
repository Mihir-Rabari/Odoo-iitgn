import express from 'express';
import * as currencyController from '../controllers/currencyController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Routes - public or optional auth
router.get('/countries', optionalAuth, currencyController.getCountries);
router.get('/exchange-rates', optionalAuth, currencyController.getExchangeRatesController);

export default router;
