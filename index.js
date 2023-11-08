const { google } = require('googleapis');
const TelegramBot = require('node-telegram-bot-api');
const schedule = require('node-schedule');
const configuration = require('dotenv');
const { promisify } = require('util');

configuration.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URL;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
const calendar = google.calendar('v3');

console.log(`
=================================================
   HapBot успешно запущен
=================================================
`);

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Привет! Я - бот для помощи с поздравлениями с днем рождения. Меня зовут HapBot. Чем я могу помочь вам?');
});

bot.onText(/\/auth/, (msg) => {
    const authUrl = auth.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar.events'],
    });

    // Отправим ссылку прямо в чат
    bot.sendMessage(msg.chat.id, `Авторизуйтесь по ссылке: ${authUrl}`);
});

bot.onText(/\/callback/, (msg) => {
    const code = msg.text.split(' ')[1];

    const getTokenAsync = async (code) => {
        try {
            const { tokens } = await auth.getToken(code);
            auth.setCredentials(tokens);
            bot.sendMessage(msg.chat.id, 'Вы успешно авторизованы!');
        } catch (error) {
            bot.sendMessage(msg.chat.id, 'Ошибка авторизации');
        }
    };

    getTokenAsync(code);
});

schedule.scheduleJob('0 0 * * *', async () => {
    try {
        const events = await calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date().toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime',
        });

        console.log('Список событий:', events.data.items);
    } catch (error) {
        console.error('Ошибка при запросе событий:', error.message);
    }
});