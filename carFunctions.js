const fs = require('fs');
const path = require('path');
const json = require('./data.json');
const Markup = require('telegraf').Markup;

function readBookingsFromFile() {
    const filePath = path.join(__dirname, 'bookings.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Ошибка чтения файла:', err);
            return;
        }
        try {
            bookings = JSON.parse(data);
        } catch (parseError) {
            console.error('Ошибка парсинга JSON:', parseError);
        }
    });
}
async function sendCar(ctx, index) {
    const car = json[index];
    const carData = 
        `🚗 *Название*: ${car.name}\n` +
        `🛠️ *Стейджи*: ${car.stage}\n` +
        `💰 *Цена*: ${car.price_day} день / ${car.price_week} неделя / ${car.price_month} месяц\n` +
        `🔑 *Залог*: ${car.zalog}\n`;

    const imagePath = path.join(__dirname, 'img', car.img[0]);

    try {
        await ctx.replyWithPhoto(
            { source: imagePath },
            {
                caption: carData,
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('⬅️ Предыдущая', 'prev_car'), 
                     Markup.button.callback('Забронировать', 'book_car'), 
                     Markup.button.callback('Следующая ➡️', 'next_car')],
                    [Markup.button.callback('🏠 Вернуться в главное меню', 'go_to_main')]
                ])
            }
        );
    } catch (error) {
        console.error("Error sending image or message:", error);
        ctx.reply(`Не удалось загрузить изображение для ${car.name}.`);
    }
}

async function editCar(ctx, index) {
    const car = json[index];
    const carData = 
        `🚗 *Название*: ${car.name}\n` +
        `🛠️ *Стейджи*: ${car.stage}\n` +
        `💰 *Цена*: ${car.price_day} день / ${car.price_week} неделя / ${car.price_month} месяц\n` +
        `🔑 *Залог*: ${car.zalog}\n`;

    const imagePath = path.join(__dirname, 'img', car.img[0]);

    try {
        await ctx.editMessageMedia(
            {
                type: 'photo',
                media: { source: imagePath },
                caption: carData,
                parse_mode: 'Markdown'
            },
            Markup.inlineKeyboard([
                [Markup.button.callback('⬅️ Предыдущая', 'prev_car'), 
                 Markup.button.callback('Забронировать', 'book_car'), 
                 Markup.button.callback('Следующая ➡️', 'next_car')],
                [Markup.button.callback('🏠 Вернуться в главное меню', 'go_to_main')]
            ])
        );
    } catch (error) {
        console.error("Error editing image or caption:", error);
        ctx.reply(`Не удалось загрузить изображение для ${car.name}.`);
    }
}

async function sendCarData(ctx, index, filteredCars) {
    if (filteredCars.length === 0) {
        ctx.reply("Не удалось найти автомобили по вашему запросу.");
        return;
    }

    const car = filteredCars[index];
    const carData = 
        `🚗 **Название**: ${car.name}\n` +
        `🛠️ **Стейджи**: ${car.stage}\n` +
        `💰 **Цена**: ${car.price_day} день / ${car.price_week} неделя / ${car.price_month} месяц\n` +
        `🔑 **Залог**: ${car.zalog}\n`;

    const imagePath = path.join(__dirname, 'img', car.img[0]);

    try {
        await ctx.replyWithPhoto(
            { source: imagePath },
            {
                caption: carData,
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('⬅️ Предыдущая', 'prev_filtered_car'), 
                    Markup.button.callback('Забронировать', 'book_car'),
                    Markup.button.callback('Следующая ➡️', 'next_filtered_car')],
                    [Markup.button.callback('🏠 Вернуться в главное меню', 'go_to_main')]
                ])
            }
        );
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
    const carData = 
        `🚗 *Название*: ${car.name}\n` +
        `🛠️ *Стейджи*: ${car.stage}\n` +
        `💰 *Цена*: ${car.price_day} день / ${car.price_week} неделя / ${car.price_month} месяц\n` +
        `🔑 *Залог*: ${car.zalog}\n`;

    const imagePath = path.join(__dirname, 'img', car.img[0]);

    try {
        await ctx.editMessageMedia(
            {
                type: 'photo',
                media: { source: imagePath },
                caption: carData,
                parse_mode: 'Markdown'
            },
            Markup.inlineKeyboard([
                [Markup.button.callback('⬅️ Предыдущая', 'prev_filtered_car'), 
                Markup.button.callback('Забронировать', 'book_car'),
                Markup.button.callback('Следующая ➡️', 'next_filtered_car')],
                [Markup.button.callback('🏠 Вернуться в главное меню', 'go_to_main')]
            ])
        );
    } catch (error) {
        console.error("Error editing image or caption:", error);
        ctx.reply(`Не удалось загрузить изображение для ${car.name}.`);
    }
}

module.exports = {
    readBookingsFromFile,
    sendCar,
    editCar,
    sendCarData,
    filterByPrice,
    editFilteredCar
};