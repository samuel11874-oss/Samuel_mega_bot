const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot em Modo de Inspeção'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

async function monitorarJogos() {
    try {
        console.log("--- Iniciando Inspeção de Dados ---");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        
        // Vamos logar os 5 primeiros elementos 'div' que ele encontrar
        $('div').slice(0, 5).each((i, el) => {
            const texto = $(el).text().trim().replace(/\s+/g, ' ');
            console.log(`🔎 Inspeção [${i}]: ${texto.substring(0, 100)}...`);
        });

        console.log("--- Inspeção Finalizada ---");
    } catch (e) {
        console.error("Erro na conexão:", e.message);
    }
}

setInterval(monitorarJogos, 600000); 
monitorarJogos();
