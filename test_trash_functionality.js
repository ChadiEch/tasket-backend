// Test script for task trash functionality
const { Task } = require('./models');
const { Op } = require('sequelize');

console.log('=== Task Trash Functionality Test ===\n');

// Test the Task model for trash-related fields
async function testModel() {
  console.log('Testing Task model for trash functionality...');
  
  // Check if the model has the required fields
  const taskModel = Task.rawAttributes;
  
  const requiredFields = [
    'status',
    'trashed_at',
    'restored_at',
    'status_before_trash'
  ];
  
  for (const field of requiredFields) {
    if (taskModel[field]) {
      console.log(`✓ Field '${field}' exists`);
    } else {
      console.log(`✗ Field '${field}' is missing`);
    }
  }
  
  // Check if 'trashed' is in the status enum
  const statusField = taskModel.status;
  if (statusField && statusField.values && statusField.values.includes('trashed')) {
    console.log(`✓ 'trashed' status is supported`);
  } else {
    console.log(`✗ 'trashed' status is not supported`);
  }
}

// Test the automatic cleanup function
async function testCleanup() {
  console.log('\nTesting automatic cleanup function...');
  
  try {
    // Import the cleanup function
    const { deleteOldTrashedTasks } = require('./services/trashCleanupService');
    
    if (typeof deleteOldTrashedTasks === 'function') {
      console.log('✓ Trash cleanup service is properly configured');
    } else {
      console.log('✗ Trash cleanup service is not properly configured');
    }
  } catch (error) {
    console.log('✗ Error importing trash cleanup service:', error.message);
  }
}

// Run tests
async function runTests() {
  try {
    await testModel();
    await testCleanup();
    
    console.log('\n=== Test Complete ===');
    console.log('Next steps:');
    console.log('1. Test the API endpoints using a REST client');
    console.log('2. Verify database changes are reflected correctly');
    console.log('3. Check file deletion functionality');
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testModel,
  testCleanup
};