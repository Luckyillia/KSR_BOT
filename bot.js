const { Telegraf, Markup } = require('telegraf');
const path = require('path');
const json = require('./data.json');
const fs = require('fs');

let stateFiltr = false;
const adminChatId = process.env.ADMIN_ID;
const admin_assistantChatId = process.env.ADMIN_ASSISTANT;

let bookings = [];
let filteredCars = [];
const adminIds = [adminChatId, admin_assistantChatId];

const userCarIndex = {};
const userStates = {};

const bot = new Telegraf(process.env.BOT_TOKEN);

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

readBookingsFromFile();

bot.start(async (ctx) => {
    await ctx.reply(
        '👋 Привет! Я твой личный помощник по аренде автомобилей. 🚗\n\n' +
        'Здесь ты можешь:\n' +
        '- Просмотреть все доступные автомобили.\n' +
        '- Использовать фильтр для поиска идеального авто.\n' +
        '- Узнать детали о каждом автомобиле.\n\n' +
        'Что бы ты хотел сделать сегодня? Выбери опцию ниже:',
        Markup.keyboard([
            ['🚗 Все Авто', '🔍 Фильтр Авто']
        ]).resize()
    );
});


bot.hears('🚗 Все Авто', async (ctx) => {
    const userId = ctx.from.id;
    userCarIndex[userId] = 0; 
    filteredCars = json; 
    console.log(ctx.from.id);
    await ctx.reply('Здесь все автомобили:', Markup.removeKeyboard());

    await sendCar(ctx, userCarIndex[userId]);
});

bot.action('next_car', async (ctx) => {
    const userId = ctx.from.id;
    userCarIndex[userId] = (userCarIndex[userId] + 1) % json.length;

    await ctx.answerCbQuery();
    await editCar(ctx, userCarIndex[userId]);
});

bot.action('prev_car', async (ctx) => {
    const userId = ctx.from.id;
    userCarIndex[userId] = (userCarIndex[userId] - 1 + json.length) % json.length;

    await ctx.answerCbQuery();
    await editCar(ctx, userCarIndex[userId]);
});

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

bot.action('book_car', async (ctx) => {
    await ctx.answerCbQuery('Вы забронировали авто, с вами свяжутся');

    await ctx.editMessageCaption('Вы забронировали авто, с вами свяжутся', {
        parse_mode: 'Markdown',
    });

    ctx.reply("Чтобы вернуться домой, нажмите кнопку", Markup.inlineKeyboard([
        Markup.button.callback('🏠 Вернуться в главное меню', 'go_to_main')
    ]));

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
        console.log(bookings);
    }

    await ctx.telegram.sendMessage(adminChatId, `Пользователь ${userLink} забронировал автомобиль:\n${carCaption}`, {
        parse_mode: 'Markdown' 
    });
    await ctx.telegram.sendMessage(admin_assistantChatId, `Пользователь ${userLink} забронировал автомобиль:\n${carCaption}`, {
        parse_mode: 'Markdown' 
    });
});


bot.hears('🔍 Фильтр Авто', async (ctx) => {
    await ctx.reply("🔍 **Фильтр авто**", Markup.removeKeyboard());
    const filtr =  "📋 **Примеры**\n\n" +
              "🔤 Только по названию пример: (BMW)\n\n" +
              "💰 Только по цене от-до и на какой срок пример: (0-12.000 / (день, неделя, месяц))\n\n" +
              "🔗 И по названию и по цене пример: (BMW, 0-12.000 / (день, неделя, месяц))\n\n" +
              "‼️ *Примечание*: Тысячи отделяются точкой.\n\n"+
              "✏️ Пожалуйста, введите свой фильтр.";
    ctx.reply(filtr, Markup.inlineKeyboard([
        Markup.button.callback('🏠 Вернуться в главное меню', 'go_to_main')
    ]));
    stateFiltr = true;
});

async function sendCarData(ctx, index) {
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

bot.action('next_filtered_car', async (ctx) => {
    const userId = ctx.from.id;

    if (filteredCars.length === 0) {
        ctx.reply("Не удалось найти автомобили по вашему запросу.");
        return;
    }

    userCarIndex[userId] = (userCarIndex[userId] + 1) % filteredCars.length;
    await ctx.answerCbQuery();
    await editFilteredCar(ctx, userCarIndex[userId]);
});

bot.action('prev_filtered_car', async (ctx) => {
    const userId = ctx.from.id;

    if (filteredCars.length === 0) {
        ctx.reply("Не удалось найти автомобили по вашему запросу.");
        return;
    }

    userCarIndex[userId] = (userCarIndex[userId] - 1 + filteredCars.length) % filteredCars.length;
    await ctx.answerCbQuery();
    await editFilteredCar(ctx, userCarIndex[userId]);
});

async function editFilteredCar(ctx, index) {
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

bot.action('go_to_main', (ctx) => {
    ctx.reply('Вы вернулись в главное меню', Markup.keyboard([
        ['🚗 Все Авто', '🔍 Фильтр Авто']
    ]).resize());
});


// Команда /admin для открытия админ-панели
bot.command('admin', async (ctx) => {
    if(adminChatId != ctx.from.id){
        return ctx.reply("Извините, доступ к админ-панели запрещен.");
    }
    await ctx.reply("Добро пожаловать в админ-панель!",Markup.removeKeyboard());
    await ctx.reply("Список Доступных Функций", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Просмотр забронированных авто", callback_data: 'view_bookings' }],
                [{ text: "Управление автомобилями", callback_data: 'manage_cars' }],
                [{ text: "Обновить фильтры", callback_data: 'update_filters' }],
                [{ text: "Выход из админ панели", callback_data: 'go_to_main' }]
            ]
        }
    });
});

// Обработчик для просмотра забронированных авто
bot.action('view_bookings', async (ctx) => {
    await ctx.answerCbQuery();
    
    if (bookings.length === 0) {
        await ctx.reply("Список бронирований пуст.", {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Назад в админ-панель", callback_data: 'back_to_admin' }]
                ]
            }
        });
    } else {
        const bookingInfo = bookings.map((booking, index) => {
            const userLink = `[${booking.user.name}](tg://user?id=${booking.user.id})`;
            return [
                { text: `#${index + 1} ${booking.car.name}`, callback_data: `booking_info_${index}` },
                { text: "Удалить", callback_data: `delete_booking_${index}` }
            ];
        });

        await ctx.reply("Список всех бронирований:", {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    ...bookingInfo, // добавляем информацию о бронированиях
                    [{ text: "Назад в админ-панель", callback_data: 'back_to_admin' }]
                ]
            }
        });
    }
});

bot.action(/delete_booking_(\d+)/, async (ctx) => {
    const index = parseInt(ctx.match[1]); // Получаем индекс из callback_data
    if (index >= 0 && index < bookings.length) {
        const removedBooking = bookings.splice(index, 1)[0]; 

        json.push(removedBooking.car);

        fs.writeFileSync('./data.json', JSON.stringify(json, null, 2));
        fs.writeFileSync('./bookings.json', JSON.stringify(bookings, null, 2));
        await ctx.answerCbQuery(`Бронирование автомобиля ${removedBooking.car.name} удалено и возвращено в список доступных автомобилей.`);
    } else {
        await ctx.answerCbQuery("Ошибка: Бронирование не найдено.");
    }

    // Обновляем список бронирований после удаления
    await ctx.editMessageReplyMarkup({
        inline_keyboard: [
            ...bookings.map((booking, index) => [
                { text: `#${index + 1} ${booking.car.name}`, callback_data: `booking_info_${index}` },
                { text: "Удалить", callback_data: `delete_booking_${index}` }
            ]),
            [{ text: "Назад в админ-панель", callback_data: 'back_to_admin' }]
        ]
    });
});

bot.action(/booking_info_(\d+)/, async (ctx) => {
    const index = parseInt(ctx.match[1]); // Получаем индекс бронирования из callback_data
    if (index >= 0 && index < bookings.length) {
        const booking = bookings[index];
        const userLink = `[${booking.user.name}](tg://user?id=${booking.user.id})`;
        const carName = booking.car.name;
        const date = booking.date;

        await ctx.reply(`Информация о бронировании:\n` +
                        `Пользователь: ${userLink}\n` +
                        `Авто: ${carName}\n` +
                        `Дата: ${date}`, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Назад к списку бронирований", callback_data: 'view_bookings' }]
                ]
            }
        });
    } else {
        await ctx.reply("Ошибка: Бронирование не найдено.");
    }
});


bot.action('manage_cars', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("Выберите действие с автомобилями:", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Добавить авто", callback_data: 'add_car' }],
                [{ text: "Удалить авто", callback_data: 'delete_car' }],
                [{ text: "Редактировать авто", callback_data: 'edit_car' }],
                [{ text: "Назад в админ-панель", callback_data: 'back_to_admin' }]
            ]
        }
    });
});

bot.action('add_car', async (ctx) => {
    await ctx.answerCbQuery();
    userStates[ctx.from.id] = 'adding_car'; 
    await ctx.reply("Пожалуйста, отправьте данные авто в формате:\n\nНазвание | Стейджи | Цена (день/неделя/месяц) | Залог | Изображение");
});

bot.action('delete_car', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("Введите название автомобиля, который хотите удалить:");
    bot.on('text', async (ctx) => {
        const carName = ctx.message.text.trim();
        const carIndex = json.findIndex(car => car.name.toLowerCase() === carName.toLowerCase());
        if (carIndex !== -1) {
            json.splice(carIndex, 1);
            fs.writeFileSync('./data.json', JSON.stringify(json, null, 2));
            await ctx.reply(`Автомобиль ${carName} успешно удален.`);
        } else {
            await ctx.reply("Автомобиль не найден.");
        }
    });
});

// Обработчик для редактирования автомобиля
bot.action('edit_car', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("Введите название автомобиля, который хотите редактировать:");
    bot.on('text', async (ctx) => {
        const carName = ctx.message.text.trim();
        const car = json.find(car => car.name.toLowerCase() === carName.toLowerCase());
        if (car) {
            await ctx.reply(`Отправьте новые данные для автомобиля ${carName} в формате:\n\nНазвание | Стейджи | Цена (день/неделя/месяц) | Залог | Изображение`);
            bot.on('text', async (ctx) => {
                const data = ctx.message.text.split('|').map(part => part.trim());
                if (data.length === 5) {
                    car.name = data[0];
                    car.stage = data[1];
                    car.price_day = data[2].split('/')[0].trim();
                    car.price_week = data[2].split('/')[1].trim();
                    car.price_month = data[2].split('/')[2].trim();
                    car.zalog = data[3];
                    car.img[0] = data[4];
                    fs.writeFileSync('./data.json', JSON.stringify(json, null, 2));
                    await ctx.reply("Данные автомобиля успешно обновлены!");
                } else {
                    await ctx.reply("Неверный формат данных.");
                }
            });
        } else {
            await ctx.reply("Автомобиль не найден.");
        }
    });
});

// Обработчик для обновления фильтров
bot.action('update_filters', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("Введите новые значения фильтров в формате:\nМинимальная цена - Максимальная цена | Период (день/неделя/месяц)");
    bot.on('text', async (ctx) => {
        const filterInput = ctx.message.text.trim();
        const [priceRange, period] = filterInput.split('|').map(part => part.trim());
        const [minPrice, maxPrice] = priceRange.split('-').map(price => parseInt(price.trim(), 10));
        const rentPeriod = period ? period.trim().toLowerCase() : 'день';

        if (!isNaN(minPrice) && !isNaN(maxPrice) && rentPeriod) {
            // Фильтры применяются к списку машин
            filteredCars = json.filter(car => filterByPrice(car, minPrice, maxPrice, rentPeriod));
            await ctx.reply("Фильтры успешно обновлены.");
        } else {
            await ctx.reply("Неверный формат фильтров.");
        }
    });
});

// Кнопка назад в админ-панель
bot.action('back_to_admin', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText("Добро пожаловать в админ-панель!", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Просмотр забронированных авто", callback_data: 'view_bookings' }],
                [{ text: "Управление автомобилями", callback_data: 'manage_cars' }],
                [{ text: "Обновить фильтры", callback_data: 'update_filters' }],
                [{ text: "Выход из админ панели", callback_data: 'go_to_main' }]
            ]
        }
    });
});


bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const state = userStates[userId];

    if (state === 'adding_car') {
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
                    "Автомобиль успешно добавлен!",
                    Markup.inlineKeyboard([
                      Markup.button.callback('🏠 Вернуться в главное меню', 'go_to_main')
                    ])
                  );
                  
                delete userStates[userId];
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
                    await sendCarData(ctx, userCarIndex[ctx.from.id]);
                } else {
                    ctx.reply('Не удалось найти автомобили по вашему запросу.');
                }
            } else {
                filteredCars = json.filter(car => car.name.toLowerCase().includes(nameFilter));

                if (filteredCars.length > 0) {
                    userCarIndex[ctx.from.id] = 0;
                    await sendCarData(ctx, userCarIndex[ctx.from.id]);
                } else {
                    ctx.reply('Не удалось найти автомобили по вашему запросу.');
                }
            }
        } else {
            ctx.reply('На такую команду я не запрограммирован..', Markup.keyboard([
                ['🚗 Все Авто', '🔍 Фильтр Авто']
            ]).resize());
        }
    }
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));