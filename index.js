const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Data Dinâmica'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Cálculo da data de amanhã (ex: 17/07)
const amanha = new Date();
amanha.setDate(amanha.getDate() + 1);
const dataFormatada = String(amanha.getDate()).padStart(2, '0') + '/' + String(amanha.getMonth() + 1).padStart(2, '0');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function monitorar() {
    try {
        console.log(`--- Buscando jogos para a data: ${dataFormatada} ---`);
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        
        const $ = cheerio.load(response.data);
        const texto = $('body').text();

        // Se o texto da data aparecer na página, o bot avisa
        if (texto.includes(dataFormatada)) {
            console.log("✅ Data encontrada no site! Analisando jogos...");
            // Lógica de captura simplificada
            // ... (resto da lógica)
        } else {
            console.log("⚠️ A data não foi encontrada na página. O site carrega os jogos via script (não lido pelo bot).");
        }
    } catch (e) {
        console.error("Erro:", e.message);
    }
}

setInterval(monitorar, 600000);
monitorar();
