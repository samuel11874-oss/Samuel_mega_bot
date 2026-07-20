const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot de Mapeamento Ativo'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.windrawwin.com/br/estatisticas/escanteios/'
};

async function diagnostico() {
    try {
        console.log("Iniciando Mapeamento Estrutural...");
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        console.log("--- INÍCIO DA LISTAGEM DE TODO O CONTEÚDO ---");
        
        // Vamos percorrer o body e imprimir o texto de tudo o que parecer um cabeçalho ou item de lista
        $('h1, h2, h3, div, span').each((i, el) => {
            const text = $(el).text().trim();
            const className = $(el).attr('class') || '';
            
            // Filtro para não imprimir lixo (apenas textos curtos e relevantes)
            if (text.length > 3 && text.length < 100) {
                console.log(`Tag: ${el.tagName} | Class: ${className} | Texto: ${text}`);
            }
        });
        
        console.log("--- FIM DA LISTAGEM ---");

    } catch (e) {
        console.error("Erro no diagnóstico:", e.message);
    }
}

setInterval(diagnostico, 600000); // Roda a cada 10 min
diagnostico();
