import TelegramBot from 'node-telegram-bot-api';
import {LowSync} from 'lowdb';
import {JSONFileSync} from 'lowdb/node'
import dotenv from 'dotenv';
import schedule from 'node-schedule';

dotenv.config();
const botToken = process.env.TELEGRAM_BOT_TOKEN;

const bot = new TelegramBot(botToken, { polling: true });
const db = new LowSync(new JSONFileSync(process.env.DB_PATH), {});
console.log(`
=======================================
    Bot started
=======================================    
`)


bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const messageOptions = {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{ text: 'Начать!', callback_data: '/auth' }]
            ]
        })
    };
    bot.sendMessage(chatId, 'Добро пожаловать! Меня зовут hapbot, я могу помочь вам никогда не забывать о днях рождениях! Напишите команду "/auth" чтобы начать', messageOptions);
});
bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    if (data === '/auth') {
        bot.sendMessage(chatId, `Отлично. Вот список моих команд:
/auth - Авторизация через почту. Обязательный этап
/add - Добавление события дня рождения
/del - Отмена события
/list - Получения списка событий
        `);
    }
});

bot.onText(/\/auth/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Пожалуйста, ведите вашу почту');

    bot.once('text', (msg) => {
        const email = msg.text;

        db.read();
        let dbData = db.data;
        dbData[chatId] = {"email": email}
        db.write();

        bot.sendMessage(chatId, `Вы зарегестрировались по почте "${email}"! Теперь, скажите мне свой список дней рождений. Добавьте событие при помощи команды "/add"`);
    });
});

bot.onText(/\/add/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Вы добавляете новое событие. Добавляйте его дату в формате ДЕНЬ.МЕСЯЦ.ГОД ЧАС:МИНУТА');

    bot.once('text', (msg) => {
        const eventTime = msg.text;
        const eventMs = parseAndValidateDate(eventTime)
        if (eventMs !== null){
            bot.sendMessage(chatId, `Отлично. Теперь введите название события`);

            bot.once('text', (msg) => {
                const eventName = msg.text;

                db.read()
                let dbData = db.data;
                dbData[chatId][eventMs] = eventName;
                db.write()
                bot.sendMessage(chatId, `Событие "${eventName}" успешно добавлено на ${eventTime}`);
            });
        } else {
            bot.sendMessage(chatId, "Кажется, вы добавили недопустимую дату. Попробуйте еще раз")
        }
    })
});

bot.onText(/\/list/, (msg) => {
    const chatId = msg.chat.id;
    db.read()
    const dbData = db.data[chatId]

    let resStr = '';
    for (let i in dbData){
        if (i === "email"){
            continue
        } else {
            const formatDate = formatMillisecondsToDate(i)
            resStr += `${formatDate} - ${dbData[i]} \n`
        }
    }
    bot.sendMessage(chatId, `Список ваших событий: \n\n ${resStr}`);
});

function parseAndValidateDate(dateString) {
    let dateRegex = /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/;

    if (!dateRegex.test(dateString)) {
        return null;
    }

    let [datePart, timePart] = dateString.split(' ');

    let [day, month, year] = datePart.split('.');
    let [hour, minute] = timePart.split(':');

    day = parseInt(day, 10);
    month = parseInt(month, 10) - 1;
    year = parseInt(year, 10);
    hour = parseInt(hour, 10);
    minute = parseInt(minute, 10);

    let parsedDate = new Date(year, month, day, hour, minute);

    if (
        parsedDate.getDate() !== day ||
        parsedDate.getMonth() !== month ||
        parsedDate.getFullYear() !== year ||
        parsedDate.getHours() !== hour ||
        parsedDate.getMinutes() !== minute
    ) {
        return null;
    }

    let maxDate = new Date(2030, 11, 31, 23, 59); // Например, максимальная дата: 31.12.2030 23:59
    if (parsedDate > maxDate) {
        return null;
    }

    return parsedDate.getTime();
}

function formatMillisecondsToDate(milliseconds) {
    let date = new Date(parseInt(milliseconds, 10));

    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let seconds = date.getSeconds();

    day = day < 10 ? '0' + day : day;
    month = month < 10 ? '0' + month : month;
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;

    let formattedDate = `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
    return formattedDate;
}

function compareDatesWithCurrentTime(database) {
    let currentDate = new Date();

    for (let id in database) {
        if (database.hasOwnProperty(id)) {
            for (let dateKey in database[id]) {
                if (dateKey <= currentDate){
                    bot.sendMessage(id, `Внимание! Напоминаю о дне рождении! ${database[id][dateKey]}`)
                }
                deleteDb(id, dateKey);
            }
        } else {
            bot.sendMessage(id, "Вы не зарегестрированы! Используйте команду /auth")
        }
    }
}

function deleteDb(id, dateKey){
    db.read();
    let dbData = db.data;
    delete dbData[id][dateKey];
    db.write();
}

schedule.scheduleJob('*/1 * * * *', () => {
    db.read();
    compareDatesWithCurrentTime(db.data);
});