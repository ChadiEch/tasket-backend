const { sequelize } = require('./models');
require('dotenv').config();

const syncDatabase = async () => {
  try {
    console.log('Syncing database...');
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced successfully!');
  } catch (error) {
    console.error('❌ Error syncing database:', error);
  } finally {
    await sequelize.close();
  }
};

syncDatabase();