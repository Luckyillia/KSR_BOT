const fs = require('fs');
const path = require('path');

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

module.exports = {
  readBookingsFromFile
};