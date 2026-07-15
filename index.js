const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Especialista: Testando Visão de Dados Ativo'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36' };

async function scrapSite(url, selector, dataFn) {
    try {
        const { data } = await axios.get(url, { headers: HEADERS, timeout: 15000 });
        const $ = cheerio.load(data);
        const results = [];
        $(selector).each((i, el) => {
            const item = dataFn($, el);
            if (item.confronto) results.push(item);
        });
        return results;
    } catch (e) {
        return [];
    }
}

async function rodarAnalise() {
    console.log("🔍 [SISTEMA] Iniciando leitura detalhada...");

    const [wdw, wincomp, betexp] = await Promise.all([
        scrapSite('https://www.windrawwin.com/br/estatisticas/escanteios/', '.wttrtab', ($ ,el) => ({
            confronto: $(el).find('.wttd').eq(5).text().trim(),
            media: $(el).find('.wttd').eq(4).text().trim()
        })),
        scrapSite('https://www.wincomparator.com/', '.match-row', ($ ,el) => ({
            confronto: $(el).find('.team-name').text().trim(),
            media: 'N/A'
        })),
        scrapSite('https://www.betexplorer.com/', '.table-main tr', ($ ,el) => ({
            confronto: $(el).find('.t-name').text().trim(),
            media: 'N/A'
        }))
    ]);

    console.log("--- DADOS CAPTURADOS ---");
    console.log("WinDrawWin:", wdw.slice(0, 5));
    console.log("Wincomparator:", wincomp.slice(0, 5));
    console.log("BetExplorer:", betexp.slice(0, 5));
    console.log("--- FIM DA LISTAGEM ---");
}

setInterval(rodarAnalise, 3600000);
rodarAnalise();
