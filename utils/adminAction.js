const { Markup } = require('telegraf');
const fs = require('fs');
let json = require('../data.json');
let bookings = require('../bookings.json');

async function viewBookings(ctx) {
  if (bookings.length === 0) {
    await ctx.editMessageText("📭 *Список бронирований пуст.*", {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: "⬅️ Назад в админ-панель", callback_data: 'back_to_admin' }]
        ]
      }
    });
  } else {
    const bookingInfo = bookings.map((booking, index) => [
      { text: `#${index + 1} ${booking.car.name} 🗒️`, callback_data: `booking_info_${index}` },
      { text: "🗑️ Удалить", callback_data: `delete_booking_${index}` }
    ]);

    await ctx.editMessageText("📜 *Список всех бронирований:*", {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          ...bookingInfo,
          [{ text: "⬅️ Назад в админ-панель", callback_data: 'back_to_admin' }]
        ]
      }
    });
  }
}

async function handleManageCars(ctx) {
  await ctx.answerCbQuery();
  await ctx.editMessageText("⚙️ Выберите действие с автомобилями:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "➕ Добавить авто", callback_data: 'add_car' }],
        [{ text: "➖ Удалить авто", callback_data: 'delete_car' }],
        [{ text: "✏️ Редактировать авто", callback_data: 'find_car_to_edit' }],
        [{ text: "⬅️ Назад в админ-панель", callback_data: 'back_to_admin' }]
      ]
    }
  });
}

async function handleAddCar(ctx, userStates) {
  await ctx.answerCbQuery();
  userStates[ctx.from.id] = 'adding_car';
  await ctx.reply("📥 *Пожалуйста, отправьте данные авто в формате:*\n\nНазвание | Стейджи | Цена (день/неделя/месяц) | Залог | Изображение",
    Markup.inlineKeyboard([
      Markup.button.callback('🏠 Вернуться в главное меню', 'go_to_main')
    ]));
}

async function handleDeleteCar(ctx, userStates) {
  await ctx.answerCbQuery();
  await ctx.reply("🗑️ Введите название автомобиля, который хотите удалить:");
  userStates[ctx.from.id] = 'delete_car';
}

async function handleFindCarToEdit(ctx, userStates) {
  await ctx.answerCbQuery();
  userStates[ctx.from.id] = { state: 'finding_car' };
  await ctx.reply("✏️ *Введите название автомобиля, который хотите редактировать:*");
}

async function handleDeleteBooking(ctx, index) {
  console.log("Deleting booking at index:", index, "Bookings length:", bookings.length); // Проверка индексов
  if (index >= 0 && index < bookings.length) {
    const removedBooking = bookings.splice(index, 1)[0];
    json.push(removedBooking.car);

    fs.writeFileSync('./data.json', JSON.stringify(json, null, 2));
    fs.writeFileSync('./bookings.json', JSON.stringify(bookings, null, 2));
    await ctx.answerCbQuery(`✅ Бронирование автомобиля ${removedBooking.car.name} удалено.`);
  } else {
    await ctx.answerCbQuery("❌ Ошибка: Бронирование не найдено.");
  }

  await ctx.editMessageReplyMarkup({
    inline_keyboard: [
      ...bookings.map((booking, idx) => [
        { text: `#${idx + 1} ${booking.car.name} 🗒️`, callback_data: `booking_info_${idx}` },
        { text: "🗑️ Удалить", callback_data: `delete_booking_${idx}` }
      ]),
      [{ text: "⬅️ Назад в админ-панель", callback_data: 'back_to_admin' }]
    ]
  });
}

async function handleBookingInfo(ctx, index) {
  console.log("Viewing booking info at index:", index, "Bookings length:", bookings.length); // Проверка индексов
  if (index >= 0 && index < bookings.length) {
    const booking = bookings[index];
    const userLink = `[${booking.user.name}](tg://user?id=${booking.user.id})`;
    const carName = booking.car.name;
    const { date } = booking;

    await ctx.editMessageText(
      `📄 *Информация о бронировании:*\n👤 Пользователь: ${userLink}\n🚗 Авто: ${carName}\n📅 Дата: ${date}`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: "⬅️ Назад к списку бронирований", callback_data: 'view_bookings' }]
          ]
        }
      }
    );
  } else {
    await ctx.reply("❌ Ошибка: Бронирование не найдено.");
  }
}

module.exports = {
  handleManageCars,
  handleDeleteCar,
  handleAddCar,
  viewBookings,
  handleFindCarToEdit,
  handleBookingInfo,
  handleDeleteBooking
};
