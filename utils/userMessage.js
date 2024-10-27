const { Markup, Telegraf } = require('telegraf');
const fs = require('fs');
const { sendCarData, filterByPrice } = require('./carFunctions.js');

let filteredCars = [];
const adminChatId = process.env.ADMIN_ID;
const adminAssistantChatId = process.env.ADMIN_ASSISTANT;

function getFilteredCars() {
  return filteredCars;
}

async function handleMessage(ctx, json, userStates, stateFiltr, userCarIndex) {
  if (ctx.message.photo || ctx.message.sticker || ctx.message.animation) {
    await ctx.reply("🚫 Извините, я вас не понимаю. Пожалуйста, отправьте текстовое сообщение.");
    try {
      await ctx.deleteMessage();
    } catch (error) {
      console.error('Ошибка удаления сообщения:', error);
    }
    return;
  }

  const userId = ctx.from.id;
  const state = userStates[userId];

  switch (state?.state || state) {
    case 'adding_car': {
      const data = ctx.message.text.split('|').map(part => part.trim());

      if (data.length === 5) {
        const [name, stage, prices, zalog, img] = data;
        const priceParts = prices.split('/');

        if (priceParts.length === 3 && priceParts.every(price => !isNaN(price))) {
          const newCar = {
            name,
            stage,
            price_day: priceParts[0],
            price_week: priceParts[1],
            price_month: priceParts[2],
            zalog,
            img: [img]
          };

          json.push(newCar);
          await fs.promises.writeFile('./data.json', JSON.stringify(json, null, 2));
          await ctx.reply(
            "🚗 Автомобиль успешно добавлен!",
            Markup.inlineKeyboard([Markup.button.callback('⬅️ Вернуться в админ панел', 'back_to_admin')])
          );
          const userName = ctx.from.username || 'Без имени';
          const userLink = `[${userName}](tg://user?id=${userId})`;
          const carData = `🚗 *Название*: ${newCar.name}\n🛠️ *Стейджи*: ${newCar.stage}\n💰 *Цена*: ${newCar.price_day} день / ${newCar.price_week} неделя / ${newCar.price_month} месяц\n🔑 *Залог*: ${newCar.zalog}\n`;
          if (adminChatId != ctx.from.id && adminAssistantChatId == ctx.from.id) {
            await ctx.telegram.sendMessage(adminChatId, `Пользователь ${userLink} добавил новый автомобиль:\n${carData}`, { parse_mode: 'Markdown' });
          }
          if (adminChatId == ctx.from.id && adminAssistantChatId != ctx.from.id) {
            await ctx.telegram.sendMessage(adminAssistantChatId, `Пользователь ${userLink} добавил новый автомобиль:\n${carData}`, { parse_mode: 'Markdown' });
          }
          delete userStates[userId];
        } else {
          await ctx.reply("🚫 *Неверный формат цены!* \n\nПожалуйста, убедитесь, что вы ввели три значения для цены в формате:\n*цена за день / цена за неделю / цена за месяц*\n\nПример: `1000/6000/20000`");
        }
      } else {
        await ctx.reply(
          "🚫 *Неверный формат данных!* \n\nПожалуйста, убедитесь, что вы используете правильный формат. \nОжидается следующий формат:\n`имя|стадия|цена_за_день/цена_за_неделю/цена_за_месяц|залог|ссылка_на_изображение`\n\nПример:\n`Toyota Camry|2020|1000/6000/20000|5000|Toyota_Camry.png`"
        );
      }
      break;
    }

    case 'finding_car': {
      const carName = ctx.message.text.trim();
      const car = json.find(car => car.name.toLowerCase() === carName.toLowerCase());

      if (car) {
        userStates[userId] = { state: 'editing_car', car };
        await ctx.reply("✅ *Автомобиль найден.*\nТеперь отправьте новые данные в формате:\n\n`Название | Стейджи | Цена (день/неделя/месяц) | Залог | Изображение`", { parse_mode: 'Markdown' });
      } else {
        await ctx.reply("❌ *Автомобиль не найден.*");
      }
      break;
    }

    case 'editing_car': {
      const car = state.car;
      const data = ctx.message.text.split('|').map(part => part.trim());

      if (data.length === 5) {
        car.name = data[0];
        car.stage = data[1];
        const prices = data[2].split('/');
        car.price_day = prices[0].trim();
        car.price_week = prices[1].trim();
        car.price_month = prices[2].trim();
        car.zalog = data[3];
        car.img[0] = data[4];

        await fs.promises.writeFile('./data.json', JSON.stringify(json, null, 2));
        await ctx.reply("✅ *Данные автомобиля успешно обновлены!*", Markup.inlineKeyboard([Markup.button.callback('⬅️ Вернуться в админ панел', 'back_to_admin')]));


        const userLink = `[${ctx.from.username || 'Без имени'}](tg://user?id=${userId})`;
        const carData = `🚗 *Название*: ${car.name}\n🛠️ *Стейджи*: ${car.stage}\n💰 *Цена*: ${car.price_day} день / ${car.price_week} неделя / ${car.price_month} месяц\n🔑 *Залог*: ${car.zalog}\n`;
        if (adminChatId != ctx.from.id && adminAssistantChatId == ctx.from.id) {
          await ctx.telegram.sendMessage(adminChatId, `Пользователь ${userLink} обновил даные автомобиля:\n${carData}`, { parse_mode: 'Markdown' });
        }
        if (adminChatId == ctx.from.id && adminAssistantChatId != ctx.from.id) {
          await ctx.telegram.sendMessage(adminAssistantChatId, `Пользователь ${userLink} обновил даные автомобиля:\n${carData}`, { parse_mode: 'Markdown' });
        }
        delete userStates[userId];
      } else {
        await ctx.reply("🚫 *Неверный формат данных!*");
      }
      break;
    }

    case 'delete_car': {
      const carName = ctx.message.text.trim();
      const carIndex = json.findIndex(car => car.name.toLowerCase() === carName.toLowerCase());

      if (carIndex !== -1) {
        const userLink = `[${ctx.from.username || 'Без имени'}](tg://user?id=${userId})`;
        const carData = `🚗 *Название*: ${json[carIndex].name}\n🛠️ *Стейджи*: ${json[carIndex].stage}\n💰 *Цена*: ${json[carIndex].price_day} день / ${json[carIndex].price_week} неделя / ${json[carIndex].price_month} месяц\n🔑 *Залог*: ${json[carIndex].zalog}\n`;
        if (adminChatId != ctx.from.id && adminAssistantChatId == ctx.from.id) {
          await ctx.telegram.sendMessage(adminChatId, `Пользователь ${userLink} удалил автомобиль:\n${carData}`, { parse_mode: 'Markdown' });
        }
        if (adminChatId == ctx.from.id && adminAssistantChatId != ctx.from.id) {
          await ctx.telegram.sendMessage(adminAssistantChatId, `Пользователь ${userLink} удалил автомобиль:\n${carData}`, { parse_mode: 'Markdown' });
        }
        json.splice(carIndex, 1);
        fs.writeFileSync('./data.json', JSON.stringify(json, null, 2));

        await ctx.reply(`✅ *Автомобиль ${carName} успешно удален.*`, Markup.inlineKeyboard([Markup.button.callback('⬅️ Вернуться в админ панел', 'back_to_admin')]));
      } else {
        await ctx.reply("❌ *Автомобиль не найден.*", Markup.inlineKeyboard([Markup.button.callback('⬅️ Вернуться в админ панел', 'back_to_admin')]));
      }
      delete userStates[userId];
      break;
    }

    default: {
      if (ctx.message.text === '🏠 Вернуться в главное меню') {
        stateFiltr = false;
        await ctx.reply('Вы вернулись в главное меню', Markup.keyboard([['🚗 Все Авто', '🔍 Фильтр Авто']]).resize());
      } else if (stateFiltr) {
        const filterInput = ctx.message.text.trim();
        let [nameFilter = '', priceRange = ''] = filterInput.includes(',') ? filterInput.split(',').map(item => item.trim().toLowerCase()) : [filterInput.toLowerCase(), ''];
        let rentPeriod = priceRange.includes('/') ? priceRange.split('/')[1].trim() : 'день';
        const [from = 0, to = Infinity] = priceRange.includes('-') ? priceRange.split('-').map(p => parseInt(p.trim(), 10)) : [0, Infinity];

        filteredCars = json.filter(car => car.name.toLowerCase().includes(nameFilter) && filterByPrice(car, from, to, rentPeriod));

        if (filteredCars.length > 0) {
          userCarIndex[ctx.from.id] = 0;
          await sendCarData(ctx, userCarIndex[ctx.from.id], filteredCars);
        } else {
          await ctx.reply('🚫 Не удалось найти автомобили по вашему запросу.', Markup.inlineKeyboard([Markup.button.callback('🏠 Вернуться в главное меню', 'go_to_main')]));
        }
      } else {
        await ctx.reply('❓ На такую команду я не запрограммирован..', Markup.keyboard([['🚗 Все Авто', '🔍 Фильтр Авто']]).resize());
      }
      break;
    }
  }
}

module.exports = {
  handleMessage,
  getFilteredCars
};
