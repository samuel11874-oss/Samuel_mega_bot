const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot de Diagnóstico de Classes Ativo'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.windrawwin.com/'
};

async function monitorarJogos() {
    try {
        console.log("Iniciando varredura de classes...");
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        console.log("--- LISTAGEM DE CLASSES DE DIV ---");
        // Vamos listar as 30 primeiras classes de div para achar o container de jogos
        $('div').each((i, el) => {
            if (i < 30) {
                const classe = $(el).attr('class');
                if (classe) {
                    console.log(`DIV ${i} (Classe: ${classe}) -> Texto: ${$(el).text().substring(0, 30).trim()}`);
                }
            }
        });
        console.log("--- FIM DA LISTAGEM ---");

    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(monitorarJogos, 300000); 
monitorarJogos();
