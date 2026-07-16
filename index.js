const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot de Diagnóstico Ativo'));
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
        console.log("--- Iniciando Varredura ---");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        console.log("Página carregada. Tamanho do conteúdo:", response.data.length, "bytes");

        const $ = cheerio.load(response.data);
        
        // Debug: Vamos ver quantas linhas ele encontra
        const totalLinhas = $('tr').length;
        console.log("Total de linhas (tr) encontradas:", totalLinhas);

        if (totalLinhas === 0) {
             // Debug extra: O que tem na página então?
             console.log("Nenhuma linha encontrada. O site pode estar usando divs ou o bot foi bloqueado.");
             // Imprime um pedaço do HTML para análise
             console.log("HTML inicial:", response.data.substring(0, 500));
        }

        $('tr').each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');
            if (linha.includes(' x ')) {
                console.log(`Linha encontrada: ${linha.substring(0, 50)}...`);
            }
        });

        console.log("--- Fim da Varredura ---");
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(monitorarJogos, 600000); 
monitorarJogos();
