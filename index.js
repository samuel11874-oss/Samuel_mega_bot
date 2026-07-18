const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot em Diagnóstico Total'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

async function diagnosticarJogos() {
    try {
        console.log("--- INICIANDO VARREDURA TOTAL ---");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 20000
        });

        const $ = cheerio.load(response.data);
        
        // Vamos percorrer TODOS os elementos <div> da página
        $('div').each((i, el) => {
            const texto = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Se encontrar " x ", vamos logar para ver o que ele achou
            if (texto.includes(' x ') && texto.length < 200) {
                console.log(`🔍 ENCONTRADO: ${texto}`);
            }
        });
        
        console.log("--- VARREDURA CONCLUÍDA ---");
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Roda a cada 5 minutos
setInterval(diagnosticarJogos, 300000); 
diagnosticarJogos();
