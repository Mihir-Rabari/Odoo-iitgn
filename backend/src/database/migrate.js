import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, connectDatabase, closeDatabase } from './connection.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigrations = async () => {
  try {
    logger.info('Starting database migrations...');
    
    await connectDatabase();

    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split by semicolon and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        await query(statement);
      } catch (error) {
        // Ignore errors for statements that already exist
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }

    logger.info('Database migrations completed successfully');
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    await closeDatabase();
    process.exit(1);
  }
};

runMigrations();
