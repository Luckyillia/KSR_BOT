const { Telegraf, Markup } = require('telegraf');
const path = require('path');
const json = require('./data.json');

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => {
    ctx.reply(`Привет, ${ctx.from.first_name}! Я тестовый бот для твоей статьи`, Markup.keyboard([
        ['🚗 Все Авто', '🔍 Фильтр Авто']
    ]).resize());
});

bot.hears('🚗 Все Авто', async (ctx) => {
    for (const car of json) {
        const carData = 
    `🚗 **Название**: ${car.name}\n` +
    `🛠️ **Стейджи**: ${car.stage}\n` +
    `💰 **Цена**: ${car.price}\n` +
    `🔑 **Залог**: ${car.zalog}\n`;

        const imagePath = path.join(__dirname, 'img', car.img[0]);

        try {
            await ctx.replyWithPhoto({ source: imagePath });
            await ctx.reply(carData);  
        } catch (error) {
            console.error("Error sending image or message:", error);
            ctx.reply(`Не удалось загрузить изображение для ${car.name}.`);
        }
    }
});

bot.hears('🔍 Фильтр Авто', (ctx) => {
    ctx.reply('Задай мне вопрос', Markup.keyboard([
        ['🏠 Вернуться в главное меню']
    ]).resize());
});

bot.hears('🏠 Вернуться в главное меню', (ctx) => {
    ctx.reply('Вы вернулись в главное меню', Markup.keyboard([
        ['🚗 Все Авто', '🔍 Фильтр Авто']
    ]).resize());
});

bot.command('home', (ctx) => {
    ctx.reply('Вы вернулись в главное меню', Markup.keyboard([
        ['🚗 Все Авто', '🔍 Фильтр Авто']
    ]).resize());
});

bot.on('text', (ctx) => {
    ctx.reply('На такую комманду я не запрограммировал..');
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
