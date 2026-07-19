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

function getBandeira(teamName) {
    const list = {
        "Flamengo": "🇧🇷", "Palmeiras": "🇧🇷", "Corinthians": "🇧🇷", "São Paulo": "🇧🇷",
        "Santos": "🇧🇷", "Cruzeiro": "🇧🇷", "Atlético": "🇧🇷", "Bahia": "🇧🇷",
        "Vasco": "🇧🇷", "Botafogo": "🇧🇷", "Fluminense": "🇧🇷", "Grêmio": "🇧🇷",
        "Internacional": "🇧🇷", "Ceará": "🇧🇷", "CRB": "🇧🇷", "Náutico": "🇧🇷",
        "Londrina": "🇧🇷", "Coritiba": "🇧🇷", "Operário": "🇧🇷", "Avaí": "🇧🇷",
        "América": "🇧🇷", "Juventude": "🇧🇷", "Criciúma": "🇧🇷", "São Bernardo": "🇧🇷",
        "Athletic": "🇧🇷", "Malmo": "🇸🇪", "Kalmar": "🇸🇪", "Hacken": "🇸🇪", "AIK": "🇸🇪"
    };
    return list[teamName] || "🏳️";
}

// --- BUSCA NO WINDRAWWIN ---
async function monitorarWinDrawWin() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        processarHtml(data, 'WinDrawWin');
    } catch (e) { console.error("Erro WinDrawWin:", e.message); }
}

// --- BUSCA NO SOCCERSTATS ---
async function monitorarSoccerStats() {
    try {
        // Exemplo: página de escanteios (ajuste a URL se precisar de uma liga específica)
        const { data } = await axios.get('https://www.soccerstats.com/results.asp?league=brazil&pmtype=corners', { headers: HEADERS });
        processarHtml(data, 'SoccerStats');
    } catch (e) { console.error("Erro SoccerStats:", e.message); }
}

// --- PROCESSADOR COMUM ---
function processarHtml(html, fonte) {
    const $ = cheerio.load(html);
    $('div, tr').each((i, el) => {
        const texto = $(el).text().trim();
        if (texto.includes(' x ') && /\d[.,]\d/.test(texto)) {
            const linhaLimpa = texto.replace(/hoje|amanhã|tomorrow|data/gi, '').trim();
            const match = linhaLimpa.match(/([A-Za-zÀ-ÿ\s]{3,})\s?x\s?([A-Za-zÀ-ÿ\s]{3,})/i);
            const numeros = linhaLimpa.match(/(\d{1,2}[.,]\d)/g);
            
            if (match && numeros && numeros.length >= 2) {
                const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                
                if (media > 9.5 && media <= 15.0) {
                    const chave = (match[1] + match[2]).toLowerCase().replace(/\s/g, '');
                    if (!jogosEnviados.has(chave)) {
                        jogosEnviados.add(chave);
                        const t1 = match[1].trim();
                        const t2 = match[2].trim();
                        const msg = `⚽ *Oportunidade (${fonte})*\n\n` +
                                    `${getBandeira(t1)} *${t1} x ${t2}*\n` +
                                    `⛳ *Média de escanteio FT: ${media.toFixed(1)}*`;
                        
                        bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                        console.log(`✅ ENVIADO: ${t1} x ${t2} via ${fonte}`);
                    }
                }
            }
        }
    });
}

// Execução sequencial para evitar bloqueio de IP
async function rodarBot() {
    await monitorarWinDrawWin();
    setTimeout(monitorarSoccerStats, 5000); // 5 segundos de intervalo entre um site e outro
}

setInterval(() => { jogosEnviados.clear(); }, 3600000); 
setInterval(rodarBot, 300000); // Roda tudo a cada 5 minutos
rodarBot();
