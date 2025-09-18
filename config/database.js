const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

// Check if we're on Railway (uses DATABASE_URL) or local development
if (process.env.DATABASE_URL) {
  // Production with DATABASE_URL (Heroku, Railway, etc.)
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
} else if (process.env.DB_NAME && process.env.DB_USER && process.env.DB_PASSWORD) {
  // PostgreSQL configuration for local development
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
} else {
  // SQLite fallback for local development
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  });
}

module.exports = sequelize;