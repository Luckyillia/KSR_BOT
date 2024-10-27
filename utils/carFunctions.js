const json = require('../data.json');
const { Markup } = require('telegraf');

async function sendCar(ctx, index) {
  if (index < 0 || index >= json.length) {
    return ctx.reply("Некорректный индекс автомобиля.");
  }

  const car = json[index];
  const carData = formatCarData(car);

  const imagePath = getCarImagePath(car.img[0]);

  try {
    await ctx.replyWithPhoto(
      { source: imagePath },
      {
        caption: carData,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('⬅️ Предыдущая', 'prev_car'),
            Markup.button.callback('Забронировать', 'book_car'),
            Markup.button.callback('Следующая ➡️', 'next_car')
          ],
          [Markup.button.callback('🏠 Вернуться в главное меню', 'go_to_main')]
        ])
      }
    );
  } catch (error) {
    console.error("Ошибка при отправке изображения или сообщения:", error);
    ctx.reply(`Не удалось загрузить изображение для ${car.name}.`);
  }
}

async function editCar(ctx, index) {
  if (index < 0 || index >= json.length) {
    return ctx.reply("Некорректный индекс автомобиля.");
  }

  const car = json[index];
  const carData = formatCarData(car);

  const imagePath = getCarImagePath(car.img[0]);

  try {
    await ctx.editMessageMedia(
      {
        type: 'photo',
        media: { source: imagePath },
        caption: carData,
        parse_mode: 'Markdown'
      },
      Markup.inlineKeyboard([
        [
          Markup.button.callback('⬅️ Предыдущая', 'prev_car'),
          Markup.button.callback('Забронировать', 'book_car'),
          Markup.button.callback('Следующая ➡️', 'next_car')
        ],
        [Markup.button.callback('🏠 Вернуться в главное меню', 'go_to_main')]
      ])
    );
  } catch (error) {
    console.error("Ошибка при редактировании изображения или подписи:", error);
    ctx.reply(`Не удалось загрузить изображение для ${car.name}.`);
  }
}

async function sendCarData(ctx, index, filteredCars) {
  if (!filteredCars || filteredCars.length === 0) {
    ctx.reply("Не удалось найти автомобили по вашему запросу.");
    return;
  }

  if (index < 0 || index >= filteredCars.length) {
    return ctx.reply("Некорректный индекс для автомобиля.");
  }

  const car = filteredCars[index];
  const carData = formatCarData(car);
  const imagePath = getCarImagePath(car.img[0]);

  try {
    await ctx.replyWithPhoto(
      { source: imagePath },
      {
        caption: carData,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('⬅️ Предыдущая', 'prev_filtered_car'),
            Markup.button.callback('Забронировать', 'book_car'),
            Markup.button.callback('Следующая ➡️', 'next_filtered_car')
          ],
          [Markup.button.callback('🏠 Вернуться в главное меню', 'go_to_main')]
        ])
      }
    );
  } catch (error) {
    console.error("Ошибка при отправке изображения или сообщения:", error);
    ctx.reply(`Не удалось загрузить изображение для ${car.name}.`);
  }
}

function formatCarData(car) {
  return (
    `🚗 *Название*: ${car.name}\n` +
    `🛠️ *Стейджи*: ${car.stage}\n` +
    `💰 *Цена*: ${car.price_day} день / ${car.price_week} неделя / ${car.price_month} месяц\n` +
    `🔑 *Залог*: ${car.zalog}\n`
  );
}

function getCarImagePath(imageName) {
  return `${process.cwd()}\\res\\img\\${imageName}`;
}

function filterByPrice(car, priceFrom, priceTo, rentPeriod) {
  let carPrice = 0;

  switch (rentPeriod) {
    case 'день':
      carPrice = parseInt(car.price_day);
      break;
    case 'неделя':
      carPrice = parseInt(car.price_week);
      break;
    case 'месяц':
      carPrice = parseInt(car.price_month);
      break;
    default:
      return false;
  }

  return carPrice >= priceFrom && carPrice <= priceTo;
}

async function editFilteredCar(ctx, index, filteredCars) {
  if (!filteredCars || filteredCars.length === 0) {
    ctx.reply("Не удалось найти автомобили по вашему запросу.");
    return;
  }
  if (index < 0 || index >= filteredCars.length) {
    ctx.reply("Некорректный индекс для автомобиля.");
    return;
  }

  const car = filteredCars[index];
  const carData = formatCarData(car);
  const imagePath = getCarImagePath(car.img[0]);

  try {
    await ctx.editMessageMedia(
      {
        type: 'photo',
        media: { source: imagePath },
        caption: carData,
        parse_mode: 'Markdown'
      },
      Markup.inlineKeyboard([
        [
          Markup.button.callback('⬅️ Предыдущая', 'prev_filtered_car'),
          Markup.button.callback('Забронировать', 'book_car'),
          Markup.button.callback('Следующая ➡️', 'next_filtered_car')
        ],
        [Markup.button.callback('🏠 Вернуться в главное меню', 'go_to_main')]
      ])
    );
  } catch (error) {
    console.error("Ошибка при редактировании изображения или подписи:", error);
    ctx.reply(`Не удалось загрузить изображение для ${car.name}.`);
  }
}

module.exports = {
  sendCar,
  editCar,
  sendCarData,
  filterByPrice,
  editFilteredCar
};
