const { Telegraf } = require('telegraf');
const json = require('./data.json');
const userModule = require('./utils/userMessage');
const bookModule = require('./utils/bookModule');
const navigationButton = require('./utils/navigationButton');
const adminAction = require('./utils/adminAction');
const userAction = require('./utils/userAction');
//const readFile = require('./utils/readFile');

let stateFiltr = false;
const adminChatId = process.env.ADMIN_ID;
const adminAssistantChatId = process.env.ADMIN_ASSISTANT;

const userCarIndex = {};
const userStates = {};

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => userAction.startHandler(ctx));
bot.hears('🚗 Все Авто', (ctx) => userAction.allCarsHandler(ctx,userCarIndex));
bot.hears('🔍 Фильтр Авто', (ctx) => userAction.filterCarsHandler(ctx, stateFiltr));
bot.command('admin', (ctx) => userAction.adminHandler(ctx, adminChatId, adminAssistantChatId));

bot.action('next_car', (ctx) => navigationButton.handleNextCar(ctx, json, userCarIndex));
bot.action('prev_car', (ctx) => navigationButton.handlePrevCar(ctx, json, userCarIndex));
bot.action('next_filtered_car', (ctx) => navigationButton.handleNextFilteredCar(ctx, userModule, userCarIndex));
bot.action('prev_filtered_car', (ctx) => navigationButton.handlePrevFilteredCar(ctx, userModule, userCarIndex));
bot.action('go_to_main', (ctx) => navigationButton.handleGoToMain(ctx));
bot.action('back_to_admin', (ctx) => navigationButton.handleBackToAdmin(ctx));

bot.action('book_car', (ctx) => bookModule.handleBooking(ctx, adminChatId, adminAssistantChatId));

bot.action('view_bookings', (ctx) => adminAction.viewBookings(ctx));
bot.action('manage_cars', (ctx) => adminAction.handleManageCars(ctx));
bot.action('add_car', (ctx) => adminAction.handleAddCar(ctx, userStates));
bot.action('delete_car', (ctx) => adminAction.handleDeleteCar(ctx, userStates));
bot.action('find_car_to_edit', (ctx) => adminAction.handleFindCarToEdit(ctx, userStates));
bot.action(/delete_booking_(\d+)/, (ctx) => {
  const index = parseInt(ctx.match[1]);
  adminAction.handleDeleteBooking(ctx, index);
});
bot.action(/booking_info_(\d+)/, (ctx) => {
  const index = parseInt(ctx.match[1]);
  adminAction.handleBookingInfo(ctx, index);
});

bot.on('message', (ctx) => userModule.handleMessage(ctx, json, userStates,stateFiltr,userCarIndex, adminChatId, adminAssistantChatId));

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));