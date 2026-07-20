const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot de Diagnóstico de Estrutura Ativo'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.windrawwin.com/br/estatisticas/escanteios/'
};

async function monitorarJogos() {
    try {
        console.log("Iniciando varredura profunda de estrutura...");
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        console.log("--- INÍCIO DO DUMP DE ESTRUTURA ---");
        
        // Vamos varrer os elementos em ordem para ver o que vem antes dos jogos
        $('body').find('*').each((i, el) => {
            const tagName = el.tagName;
            const text = $(el).text().trim();
            
            // Filtramos apenas elementos com texto relevante e classes de menu
            if (tagName === 'div' && $(el).hasClass('menu-item-content')) {
                console.log(`ELEMENTO: ${tagName} (Classe: ${$(el).attr('class')}) | CONTEÚDO: ${text}`);
            }
            // Procuramos cabeçalhos (h2, h3) que podem conter a data
            if (['h2', 'h3'].includes(tagName) && text.length > 0) {
                console.log(`CABEÇALHO ENCONTRADO: ${tagName} | CONTEÚDO: ${text}`);
            }
        });
        
        console.log("--- FIM DO DUMP ---");

    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(monitorarJogos, 300000); 
monitorarJogos();
