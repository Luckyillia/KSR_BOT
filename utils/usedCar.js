const fs = require('fs').promises; // Используйте промисы для работы с файлами
const bookings = require('../bookings.json');
let usedCars = require('../used_car.json');
const json = require('../data.json');
// Функция для выбора срока аренды
async function handleChooseRentalDuration(ctx, index) {
  await ctx.answerCbQuery();
  await ctx.editMessageText("⚙️ Выберите на сколько дать в аренду", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "День", callback_data: `day_${index}` }],
        [{ text: "Неделя", callback_data: `week_${index}` }],
        [{ text: "Месяц", callback_data: `month_${index}` }],
        [{ text: "⬅️ Назад в список всех бронирований", callback_data: 'view_bookings' }]
      ]
    }
  });
}

// Основная функция для обработки добавления в использование
async function handleAddToUsed(ctx, index, userStates, adminChatId, adminAssistantChatId) {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  // Определяем продолжительность аренды в днях и текст для уведомления
  const rentalDuration = getRentalDuration(ctx.callbackQuery.data);
  if (!rentalDuration) {
    await ctx.reply("❌ Ошибка: неверный тип аренды.");
    return;
  }

  if (index !== -1) {
    const booking = bookings.splice(index, 1)[0];
    const startUsingDate = new Date().toLocaleString();
    const endUsingDate = new Date(new Date().setDate(new Date().getDate() + rentalDuration.days)).toLocaleString();

    const usedCar = {
      car: booking.car,
      user_used: {
        id: booking.user.id,
        name: booking.user.name,
      },
      admin: {
        id: userId,
        name: ctx.from.username || 'Без имени'
      },
      start_date: startUsingDate,
      end_date: endUsingDate
    };

    usedCars.push(usedCar);

    // Сохраняем обновленные данные в файлы
    try {
      await fs.writeFile('./bookings.json', JSON.stringify(bookings, null, 2));
      await fs.writeFile('./used_car.json', JSON.stringify(usedCars, null, 2));
    } catch (error) {
      console.error("Ошибка при сохранении данных:", error);
      await ctx.reply("❌ Ошибка при сохранении данных. Пожалуйста, попробуйте снова позже.");
      return;
    }

    await ctx.editMessageText(`🚗 Вы дали на аренду автомобиль на ${rentalDuration.text}: ${usedCar.car.name}`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "⬅️ Назад в список всех бронирований", callback_data: 'view_bookings' }]
        ]
      }
    });

    const userLink = `[${ctx.from.username || 'Без имени'}](tg://user?id=${userId})`;
    const messageText = `👤 Пользователь ${userLink} добавил новый автомобиль в использование:\n🚗 ${usedCar.car.name}`;
    if (adminChatId !== ctx.from.id && adminAssistantChatId === ctx.from.id) {
      await ctx.telegram.sendMessage(adminChatId, messageText, { parse_mode: 'Markdown' });
    }
    if (adminChatId === ctx.from.id && adminAssistantChatId !== ctx.from.id) {
      await ctx.telegram.sendMessage(adminAssistantChatId, messageText, { parse_mode: 'Markdown' });
    }

    console.log(`Автомобиль ${usedCar.car.name} был добавлен в использование пользователем ${userLink} с ${startUsingDate} до ${endUsingDate}.`);
  } else {
    await ctx.reply("❌ Ошибка: автомобиль не найден.");
  }
}

// Вспомогательная функция для получения продолжительности аренды
function getRentalDuration(callbackData) {
  const parts = callbackData.split('_');
  const durationType = parts[0]; // day, week, month
  switch (durationType) {
    case 'day':
      return { days: 1, text: '1 день' };
    case 'week':
      return { days: 7, text: '1 неделя' };
    case 'month':
      return { days: 30, text: '1 месяц' };
    default:
      return null;
  }
}

function parseDate(dateString) {
  // Разделяем дату и время
  const [datePart, timePart] = dateString.split(', ');

  // Получаем день, месяц и год
  const parts = datePart.split('.');
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Месяцы в JavaScript начинаются с 0
  const year = parseInt(parts[2], 10);

  // Разделяем время на часы и минуты
  const timeParts = timePart.split(':');
  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);

  // Создаем объект Date с годом, месяцем, днем, часами и минутами
  return new Date(year, month, day, hours, minutes);
}


async function checkExpiredRentals(ctx, adminChatId, adminAssistantChatId) {
  console.log("Проверка истекших сроков аренды начата...");

  const currentDate = new Date();
  const carsToRemove = [];

  for (const usedCar of usedCars) {
    const endDate = parseDate(usedCar.end_date);
    console.log(`Проверяем автомобиль: ${usedCar.car.name}, срок аренды до: ${endDate}`);

    if (endDate < currentDate) {
      const messageText = `⚠️ Срок аренды автомобиля "${usedCar.car.name.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1')}" истек для пользователя ${usedCar.user_used.name.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1')}.`;

      console.log(`Отправка сообщения: ${messageText}`); // Логируем текст сообщения
      try {
        await ctx.telegram.sendMessage(adminChatId, messageText, { parse_mode: 'Markdown' });
        await ctx.telegram.sendMessage(adminAssistantChatId, messageText, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error("Ошибка при отправке сообщения:", error);
      }

      carsToRemove.push(usedCar.car);
    }
  }
  for (const carToRemove of carsToRemove) {
    const index = usedCars.findIndex(car => car.car.name === carToRemove.name);
    if (index !== -1) {
      usedCars.splice(index, 1);
    }
  }
  await fs.writeFile('./used_car.json', JSON.stringify(usedCars, null, 2));
  if (carsToRemove.length > 0) {
    const updatedCars = json.concat(carsToRemove);
    await fs.writeFile('./data.json', JSON.stringify(updatedCars, null, 2));
    console.log("Обновленный список автомобилей сохранён в data.json");
  } else {
    console.log("Нет истекших автомобилей для обработки.");
  }
}



module.exports = {
  handleChooseRentalDuration,
  handleAddToUsed,
  checkExpiredRentals
};
