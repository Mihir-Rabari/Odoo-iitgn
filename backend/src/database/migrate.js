import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, connectDatabase, closeDatabase } from './connection.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const splitSQLStatements = (sql) => {
  const statements = [];
  let current = '';
  let inFunction = false;
  
  const lines = sql.split('\n');
  
  for (const line of lines) {
    // Skip empty lines and standalone comments
    const trimmed = line.trim();
    if (trimmed === '' || (trimmed.startsWith('--') && !current)) {
      continue;
    }
    
    // Check if we're entering/exiting a function definition
    if (line.includes('$$')) {
      inFunction = !inFunction;
    }
    
    current += line + '\n';
    
    // If we hit a semicolon and we're not in a function, it's a statement boundary
    if (line.includes(';') && !inFunction) {
      const statement = current.trim();
      if (statement.length > 0 && !statement.startsWith('--')) {
        statements.push(statement);
      }
      current = '';
    }
  }
  
  // Add any remaining statement
  if (current.trim().length > 0) {
    statements.push(current.trim());
  }
  
  return statements;
};

const runMigrations = async () => {
  try {
    logger.info('Starting fresh database migrations...');
    
    await connectDatabase();

    // Step 1: Clean slate - drop all tables (cascade to handle dependencies)
    logger.info('Dropping existing tables...');
    const dropTables = [
      'DROP TABLE IF EXISTS notifications CASCADE',
      'DROP TABLE IF EXISTS expense_approval_rules CASCADE',
      'DROP TABLE IF EXISTS approval_history CASCADE',
      'DROP TABLE IF EXISTS approval_rule_approvers CASCADE',
      'DROP TABLE IF EXISTS approval_rules CASCADE',
      'DROP TABLE IF EXISTS expenses CASCADE',
      'DROP TABLE IF EXISTS expense_categories CASCADE',
      'DROP TABLE IF EXISTS users CASCADE',
      'DROP TABLE IF EXISTS companies CASCADE',
      'DROP FUNCTION IF EXISTS update_updated_at_column CASCADE'
    ];

    for (const dropStmt of dropTables) {
      try {
        await query(dropStmt);
      } catch (err) {
        // Ignore errors for non-existent tables
      }
    }

    logger.info('Creating fresh database schema...');

    // Step 2: Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split SQL into individual statements
    const statements = splitSQLStatements(schema);
    
    logger.info(`Executing ${statements.length} SQL statements...`);

    let executedCount = 0;
    for (const statement of statements) {
      try {
        await query(statement);
        executedCount++;
      } catch (error) {
        logger.error('Failed to execute statement:', {
          error: error.message,
          statement: statement.substring(0, 150) + '...'
        });
        throw error;
      }
    }

    logger.info(`✅ Successfully executed ${executedCount} SQL statements`);
    logger.info('✅ Database migrations completed successfully!');
    
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', error.message);
    await closeDatabase();
    process.exit(1);
  }
};

runMigrations();
