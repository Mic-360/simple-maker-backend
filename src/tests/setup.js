const fs = require('fs').promises;
const path = require('path');

// Backup data files before tests
async function backupData() {
  const files = ['users.json', 'machines.json', 'events.json', 'makerspace.json'];
  for (const file of files) {
    const filePath = path.join(__dirname, '../data', file);
    const backupPath = path.join(__dirname, '../data', `${file}.backup`);
    try {
      await fs.copyFile(filePath, backupPath);
    } catch (error) {
      console.error(`Error backing up ${file}:`, error);
    }
  }
}

// Restore data files after tests
async function restoreData() {
  const files = ['users.json', 'machines.json', 'events.json', 'makerspace.json'];
  for (const file of files) {
    const filePath = path.join(__dirname, '../data', file);
    const backupPath = path.join(__dirname, '../data', `${file}.backup`);
    try {
      await fs.copyFile(backupPath, filePath);
      await fs.unlink(backupPath);
    } catch (error) {
      console.error(`Error restoring ${file}:`, error);
    }
  }
}

module.exports = {
  backupData,
  restoreData
}; 