const fs = require('fs');
const path = require('path');
const userCarIndexPath = '../userCarIndex.json';

function readBookingsFromFile() {
  const filePath = path.join(__dirname, 'bookings.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Ошибка чтения файла:', err);
      return;
    }
    try {
      bookings = JSON.parse(data); // Преобразуем JSON в объект
    } catch (parseError) {
      console.error('Ошибка парсинга JSON:', parseError);
    }
  });
}

function saveUserCarIndex(userCarIndex) {
  fs.writeFileSync(userCarIndexPath, JSON.stringify(userCarIndex, null, 2));
}

function loadUserCarIndex(userCarIndex) {
  if (fs.existsSync(userCarIndexPath)) {
    const data = fs.readFileSync(userCarIndexPath, 'utf-8');
    Object.assign(userCarIndex, JSON.parse(data));
  }
  return userCarIndex;
}

module.exports = {
  readBookingsFromFile,
  saveUserCarIndex,
  loadUserCarIndex
};