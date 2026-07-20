const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Multi-Fonte Ativo'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

let jogosEnviados = new Set();

// Lista de bloqueio de palavras (Anti-Lixo)
const LIXO = ["WinDrawWin", "Palpites", "Jogos", "Estatísticas", "Página", "Total", "Próxima", "Brasileirão", "Mais", "Menos", "Home", "Odds", "Average", "League", "Results"];

function processarTexto(texto, fonte) {
    if (texto.includes(' x ') && texto.length < 60) {
        const contemLixo = LIXO.some(termo => texto.toLowerCase().includes(termo.toLowerCase()));
        
        if (!contemLixo) {
            const match = texto.match(/([A-Za-zÀ-ÿ\s]{3,})\s?x\s?([A-Za-zÀ-ÿ\s]{3,})/i);
            if (match) {
                const t1 = match[1].trim();
                const t2 = match[2].trim();
                const chave = (t1 + t2).toLowerCase().replace(/\s/g, '');
                
                if (!jogosEnviados.has(chave)) {
                    jogosEnviados.add(chave);
                    const msg = `⚽ *Oportunidade (${fonte})*\n\n*${t1} x ${t2}*`;
                    bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                    console.log(`✅ ENVIADO (${fonte}): ${t1} x ${t2}`);
                }
            }
        }
    }
}

async function monitorarWinDrawWin() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        $('div, a').each((i, el) => processarTexto($(el).text().trim(), 'WinDrawWin'));
    } catch (e) { console.error("Erro WinDrawWin:", e.message); }
}

async function monitorarSoccerStats() {
    try {
        // Busca na página de resultados de escanteios do Brasil
        const { data } = await axios.get('https://www.soccerstats.com/results.asp?league=brazil&pmtype=corners', { headers: HEADERS });
        const $ = cheerio.load(data);
        // No soccerstats, os jogos ficam geralmente em tabelas
        $('tr').each((i, el) => processarTexto($(el).text().trim(), 'SoccerStats'));
    } catch (e) { console.error("Erro SoccerStats:", e.message); }
}

async function rodarBot() {
    await monitorarWinDrawWin();
    setTimeout(monitorarSoccerStats, 5000); // Pausa para não bloquear IP
}

setInterval(() => { jogosEnviados.clear(); }, 3600000); 
setInterval(rodarBot, 300000); 
rodarBot();
