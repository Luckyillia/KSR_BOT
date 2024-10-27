const { Markup } = require('telegraf');
const json = require('./data.json');
const { filterByPrice, sendCarData, downloadImage } = require('./utils/carFunctions');
const userCarImages = {};

bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const state = userStates[userId];

  if (state === 'adding_car') {
    const data = ctx.message.text.split('|').map(part => part.trim());
    if (data.length === 5) {
      const [name, stage, prices, zalog] = data;
      const priceParts = prices.split('/');

      if (priceParts.length === 3 && priceParts.every(price => !isNaN(price))) {
        // Сохраняем данные автомобиля в userStates и запрашиваем фото
        userStates[userId] = {
          ...userStates[userId],
          carData: { name, stage, price_day: priceParts[0], price_week: priceParts[1], price_month: priceParts[2], zalog }
        };
        await ctx.reply("Теперь отправьте фото автомобиля.");
      } else {
        await ctx.reply("Неверный формат цены. Убедитесь, что вы ввели три значения для цены.");
      }
    } else {
      await ctx.reply("Неверный формат данных. Пожалуйста, используйте правильный формат.");
    }
  } else {
    if (ctx.message.text === '🏠 Вернуться в главное меню') {
      stateFiltr = false;

      return ctx.reply('Вы вернулись в главное меню', Markup.keyboard([
        ['🚗 Все Авто', '🔍 Фильтр Авто']
      ]).resize());
    }

    if (stateFiltr) {
      const filterInput = ctx.message.text.trim();
      let nameFilter = '';
      let priceRange = '';
      let rentPeriod = 'день';

      if (filterInput.includes(',')) {
        const parts = filterInput.split(',').map(item => item.trim().toLowerCase());
        nameFilter = parts[0];
        priceRange = parts[1];
      } else if (filterInput.includes('/')) {
        priceRange = filterInput.toLowerCase();
      } else {
        nameFilter = filterInput.toLowerCase();
      }

      if (priceRange.includes('/')) {
        const [price, period] = priceRange.split('/');
        rentPeriod = period.trim();

        let priceFrom = 0;
        let priceTo = Infinity;

        const [from, to] = price.split('-').map(price => parseInt(price.trim(), 10));
        priceFrom = isNaN(from) ? 0 : from;
        priceTo = isNaN(to) ? Infinity : to;

        filteredCars = json.filter(car => {
          const nameMatches = nameFilter ? car.name.toLowerCase().includes(nameFilter) : true;
          return nameMatches && filterByPrice(car, priceFrom, priceTo, rentPeriod);
        });

        if (filteredCars.length > 0) {
          userCarIndex[ctx.from.id] = 0;
          await sendCarData(ctx, userCarIndex[ctx.from.id],filteredCars);
        } else {
          ctx.reply('Не удалось найти автомобили по вашему запросу.');
        }
      } else {
        filteredCars = json.filter(car => car.name.toLowerCase().includes(nameFilter));

        if (filteredCars.length > 0) {
          userCarIndex[ctx.from.id] = 0;
          await sendCarData(ctx, userCarIndex[ctx.from.id],filteredCars);
        } else {
          ctx.reply('Не удалось найти автомобили по вашему запросу.',
            Markup.inlineKeyboard([
              Markup.button.callback('🏠 Вернуться в главное меню', 'go_to_main')
            ])
          );
        }
      }
    } else {
      ctx.reply('На такую команду я не запрограммирован..', Markup.keyboard([
        ['🚗 Все Авто', '🔍 Фильтр Авто']
      ]).resize());
    }
  }
});

bot.on('photo', async (ctx) => {
  const userId = ctx.from.id;
  const state = userStates[userId];

  if (state && state.carData) {
    const photo = ctx.message.photo.pop(); // Получаем самое большое изображение
    const fileId = photo.file_id;
    const imgDir = './img';

    try {
      // Загружаем изображение с помощью метода Telegram API
      const link = await ctx.telegram.getFileLink(fileId);
      const imgPath = path.join(imgDir, `${fileId}.jpg`);
      await downloadImage(link, imgPath);

      // Сохраняем изображение в userCarImages и добавляем к данным автомобиля
      userCarImages[userId] = imgPath;
      userStates[userId].carData.img = [imgPath];

      // Добавляем автомобиль в json
      json.push(userStates[userId].carData);
      await fs.promises.writeFile('./data.json', JSON.stringify(json, null, 2));

      await ctx.reply(
        "Автомобиль успешно добавлен!",
        Markup.inlineKeyboard([Markup.button.callback('🏠 Вернуться в главное меню', 'go_to_main')])
      );

      // Очистка временных данных
      delete userStates[userId];
      delete userCarImages[userId];
    } catch (err) {
      console.error("Ошибка загрузки изображения:", err);
      await ctx.reply("Не удалось сохранить изображение. Пожалуйста, попробуйте снова.");
    }
  } else {
    ctx.reply("Сначала добавьте текстовые данные автомобиля.");
  }
});

async function downloadImage(url, filepath) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.promises.mkdir(path.dirname(filepath), { recursive: true });
  await fs.promises.writeFile(filepath, buffer);
}