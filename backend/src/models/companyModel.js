import { query } from '../database/connection.js';

export const createCompany = async (companyData) => {
  const { name, currency, country } = companyData;
  
  const result = await query(
    `INSERT INTO companies (name, currency, country)
     VALUES ($1, $2, $3)
     RETURNING id, name, currency, country, created_at`,
    [name, currency, country]
  );
  
  return result.rows[0];
};

export const findCompanyById = async (id) => {
  const result = await query(
    'SELECT * FROM companies WHERE id = $1',
    [id]
  );
  return result.rows[0];
};

export const updateCompany = async (id, updates) => {
  const allowedUpdates = ['name', 'currency', 'country'];
  const updateFields = [];
  const params = [];
  let paramCount = 0;

  for (const [key, value] of Object.entries(updates)) {
    if (allowedUpdates.includes(key)) {
      paramCount++;
      updateFields.push(`${key} = $${paramCount}`);
      params.push(value);
    }
  }

  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }

  paramCount++;
  params.push(id);

  const result = await query(
    `UPDATE companies SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${paramCount}
     RETURNING *`,
    params
  );

  return result.rows[0];
};

export const createDefaultCategories = async (companyId) => {
  const categories = [
    { name: 'Food & Dining', description: 'Meals and food expenses' },
    { name: 'Transportation', description: 'Travel and transport expenses' },
    { name: 'Accommodation', description: 'Hotel and lodging expenses' },
    { name: 'Office Supplies', description: 'Stationery and office materials' },
    { name: 'Entertainment', description: 'Client entertainment expenses' },
    { name: 'Communication', description: 'Phone and internet expenses' },
    { name: 'Miscellaneous', description: 'Other expenses' }
  ];

  for (const category of categories) {
    await query(
      `INSERT INTO expense_categories (company_id, name, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (company_id, name) DO NOTHING`,
      [companyId, category.name, category.description]
    );
  }
};

export default {
  createCompany,
  findCompanyById,
  updateCompany,
  createDefaultCategories
};
