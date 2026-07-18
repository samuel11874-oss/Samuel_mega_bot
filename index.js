const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot em Modo Espião - Analisando tudo'));
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
        console.log("--- Iniciando Varredura Espião ---");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 20000
        });

        const $ = cheerio.load(response.data);
        const elementos = $('div, tr, li, td');

        elementos.each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');

            // ESPIÃO: Se tiver " x ", ele vai mostrar no log o que achou
            if (linha.includes(' x ')) {
                // Tenta achar qualquer número decimal
                const numeros = linha.match(/\d{1,2}\.\d/g);
                const valor = numeros ? numeros[0] : "SEM_MEDIA";
                
                console.log(`🔍 ACHOU: ${linha.substring(0, 50)}... | Média detectada: ${valor}`);

                // Filtro flexível para você ver o que passa
                const valorFloat = parseFloat(valor);
                
                if (valorFloat > 0) {
                     console.log(`   -> Valor convertido: ${valorFloat}`);
                }
            }
        });
        console.log("--- Varredura Finalizada ---");
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(monitorarJogos, 300000); 
monitorarJogos();
