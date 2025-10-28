const { Sequelize } = require('sequelize');
const sequelize = require('../config/database');

async function runMigration() {
  try {
    console.log('Running migration to add project_id to tasks table...');
    
    // Check if the column already exists
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tasks' AND column_name = 'project_id'
    `);
    
    if (results.length > 0) {
      console.log('Column project_id already exists in tasks table');
      return;
    }
    
    // Add the project_id column
    await sequelize.query(`
      ALTER TABLE tasks 
      ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL ON UPDATE CASCADE
    `);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    
    // Try SQLite syntax if PostgreSQL failed
    try {
      console.log('Trying SQLite syntax...');
      await sequelize.query(`
        ALTER TABLE tasks 
        ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL ON UPDATE CASCADE
      `);
      console.log('SQLite migration completed successfully!');
    } catch (sqliteError) {
      console.error('SQLite migration also failed:', sqliteError);
    }
  }
}

runMigration();