const { Telegraf, Markup } = require('telegraf');
const path = require('path');
const json = require('./data.json');

let stateFiltr = false;

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
    `💰 **Цена**: ${car.price_day} день / ${car.price_week} неделя / ${car.price_month} месяц\n` +
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
    const filtr = "🔍 **Фильтр авто**\n\n" +
              "📋 **Примеры**\n\n" +
              "🔤 Только по названию пример: (BMW)\n\n" +
              "💰 Только по цене от-до и на какой срок пример: (0-12.000 / (день, неделя, месяц))\n\n" +
              "🔗 И по названию и по цене пример: (BMW, 0-12.000 / (день, неделя, месяц))\n\n" +
              "✏️ Пожалуйста, введите свой фильтр.";
    ctx.reply(filtr, Markup.keyboard([
        ['🏠 Вернуться в главное меню']
    ]).resize());
    stateFiltr = true;
});

async function sendCarData(ctx, car) {
    const carData = 
        `🚗 **Название**: ${car.name}\n` +
        `🛠️ **Стейджи**: ${car.stage}\n` +
        `💰 **Цена**: ${car.price_day} день / ${car.price_week} неделя / ${car.price_month} месяц\n` +
        `🔑 **Залог**: ${car.zalog}\n`;

    const imagePath = path.join(__dirname, 'img', car.img[0]);

    try {
        await ctx.replyWithPhoto({ source: imagePath });
        await ctx.reply(carData, Markup.keyboard([
            ['🚗 Все Авто', '🔍 Фильтр Авто']
        ]).resize());
    } catch (error) {
        console.error("Error sending image or message:", error);
        ctx.reply(`Не удалось загрузить изображение для ${car.name}.`);
    }
    stateFiltr = false;
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

    return (carPrice >= priceFrom && carPrice <= priceTo);
}

bot.on('text', async (ctx) => {
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

            const filteredCars = json.filter(car => {
                const nameMatches = nameFilter ? car.name.toLowerCase().includes(nameFilter) : true;
                return nameMatches && filterByPrice(car, priceFrom, priceTo, rentPeriod);
            });

            if (filteredCars.length > 0) {
                for (const car of filteredCars) {
                    await sendCarData(ctx, car);
                }
            } else {
                ctx.reply('Не удалось найти автомобили по вашему запросу.');
            }
        } else {
            const filteredCars = json.filter(car => car.name.toLowerCase().includes(nameFilter));

            if (filteredCars.length > 0) {
                for (const car of filteredCars) {
                    await sendCarData(ctx, car);
                }
            } else {
                ctx.reply('Не удалось найти автомобили по вашему запросу.');
            }
        }
    } else {
        ctx.reply('На такую команду я не запрограммирован..', Markup.keyboard([
            ['🚗 Все Авто', '🔍 Фильтр Авто']
        ]).resize());
    }
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
    ctx.reply('На такую команду я не запрограммирован..');
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));