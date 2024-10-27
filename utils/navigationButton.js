const { Markup } = require('telegraf');
const { editCar, editFilteredCar } = require('./carFunctions');

async function handleNextCar(ctx, json, userCarIndex) {
  const userId = ctx.from.id;

  // Проверка на наличие автомобилей
  if (json.length === 0) {
    await ctx.reply("❌ Не удалось найти автомобили.");
    return;
  }

  userCarIndex[userId] = (userCarIndex[userId] + 1) % json.length;

  await ctx.answerCbQuery();
  await editCar(ctx, userCarIndex[userId]);
}

async function handlePrevCar(ctx, json, userCarIndex) {
  const userId = ctx.from.id;

  // Проверка на наличие автомобилей
  if (json.length === 0) {
    await ctx.reply("❌ Не удалось найти автомобили.");
    return;
  }

  userCarIndex[userId] = (userCarIndex[userId] - 1 + json.length) % json.length;

  await ctx.answerCbQuery();
  await editCar(ctx, userCarIndex[userId]);
}

async function handleNextFilteredCar(ctx, userModule, userCarIndex) {
  const userId = ctx.from.id;
  const filteredCars = userModule.getFilteredCars();

  // Проверка на наличие отфильтрованных автомобилей
  if (filteredCars.length === 0) {
    await ctx.reply("❌ Не удалось найти автомобили по вашему запросу.");
    return;
  }

  userCarIndex[userId] = (userCarIndex[userId] + 1) % filteredCars.length;
  await ctx.answerCbQuery();
  await editFilteredCar(ctx, userCarIndex[userId], filteredCars);
}

async function handlePrevFilteredCar(ctx, userModule, userCarIndex) {
  const userId = ctx.from.id;
  const filteredCars = userModule.getFilteredCars();

  // Проверка на наличие отфильтрованных автомобилей
  if (filteredCars.length === 0) {
    await ctx.reply("❌ Не удалось найти автомобили по вашему запросу.");
    return;
  }

  userCarIndex[userId] = (userCarIndex[userId] - 1 + filteredCars.length) % filteredCars.length;
  await ctx.answerCbQuery();
  await editFilteredCar(ctx, userCarIndex[userId], filteredCars);
}

async function handleGoToMain(ctx) {
  await ctx.reply('Вы вернулись в главное меню', Markup.keyboard([
    ['🚗 Все Авто', '🔍 Фильтр Авто']
  ]).resize());
  await ctx.deleteMessage();
}

async function handleBackToAdmin(ctx) {
  await ctx.answerCbQuery();
  await ctx.editMessageText("📋 *Список Доступных Функций*", {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: "📅 Просмотр забронированных авто", callback_data: 'view_bookings' }],
        [{ text: "🚗 Управление автомобилями", callback_data: 'manage_cars' }],
        [{ text: "⬅️ Выход из админ панели", callback_data: 'go_to_main' }]
      ]
    }
  });
}

module.exports = {
  handleNextCar,
  handlePrevCar,
  handleNextFilteredCar,
  handlePrevFilteredCar,
  handleGoToMain,
  handleBackToAdmin
};
