const fs = require('fs');
let json = require('../data.json');
let bookings = require('../bookings.json');

function handleBooking(ctx, adminChatId, adminAssistantChatId) {
  ctx.answerCbQuery('✅ Вы забронировали авто, с вами свяжутся');
  ctx.editMessageCaption('✅ Вы забронировали авто, с вами свяжутся', {
    parse_mode: 'Markdown',
  });

  ctx.reply("Чтобы вернуться домой, нажмите кнопку", {
    reply_markup: {
      inline_keyboard: [[
        { text: '🏠 Вернуться в главное меню', callback_data: 'go_to_main' }
      ]]
    }
  });

  const userId = ctx.from.id;
  const userName = ctx.from.username ? ctx.from.username : 'Без имени';
  const userLink = `[${userName}](tg://user?id=${userId})`;

  const carCaption = ctx.callbackQuery.message.caption;

  const carIndex = json.findIndex(car =>
    carCaption.includes(car.name)
  );

  if (carIndex !== -1) {
    const bookedCar = json.splice(carIndex, 1)[0];
    const bookingDate = new Date().toLocaleString();
    bookings.push({
      car: bookedCar,
      user: { id: userId, name: userName },
      date: bookingDate
    });
    fs.writeFileSync('./data.json', JSON.stringify(json, null, 2));
    fs.writeFileSync('./bookings.json', JSON.stringify(bookings, null, 2));
  }

  ctx.telegram.sendMessage(adminChatId, `Пользователь ${userLink} забронировал автомобиль:\n${carCaption}`, {
    parse_mode: 'Markdown'
  });
  ctx.telegram.sendMessage(adminAssistantChatId, `Пользователь ${userLink} забронировал автомобиль:\n${carCaption}`, {
    parse_mode: 'Markdown'
  });
}

module.exports = { handleBooking };
