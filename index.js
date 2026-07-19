const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Gatilho de Data Estrito Ativo'));
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

async function monitorarWinDrawWin() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        
        const $ = cheerio.load(data);
        let capturando = true; // Começa true (hoje)
        const diaHoje = 19; // Dia atual

        $('div, tr, h2, h3').each((i, el) => {
            const texto = $(el).text().trim();
            
            // Lógica de Bloqueio: Se encontrar data, verifica se é hoje
            if (/(\d{1,2})\s+de\s+julho/i.test(texto)) {
                const diaEncontrado = parseInt(texto.match(/(\d{1,2})/)[1]);
                if (diaEncontrado === diaHoje || /hoje/i.test(texto)) {
                    capturando = true;
                } else {
                    capturando = false; // Encontrou futuro, bloqueia!
                }
                return;
            }

            // Só processa se a captura estiver ligada
            if (capturando && texto.includes(' x ') && /\d[.,]\d/.test(texto)) {
                const match = texto.match(/([A-Za-zÀ-ÿ\s]{3,})\s?x\s?([A-Za-zÀ-ÿ\s]{3,})/i);
                const numeros = texto.match(/(\d{1,2}[.,]\d)/g);
                
                if (match && numeros && numeros.length >= 2) {
                    const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                    
                    if (media > 9.5 && media <= 15.0) {
                        const t1 = match[1].trim();
                        const t2 = match[2].trim();
                        const chave = (t1 + t2).toLowerCase().replace(/\s/g, '');
                        
                        if (!jogosEnviados.has(chave)) {
                            jogosEnviados.add(chave);
                            const msg = `⚽ *Oportunidade encontrada*\n\n` +
                                        `${getBandeira(t1)} *${t1} x ${t2}*\n` +
                                        `⛳ *Média de escanteio FT: ${media.toFixed(1)}*`;
                            bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                        }
                    }
                }
            }
        });
    } catch (e) { console.error("Erro WinDrawWin:", e.message); }
}

setInterval(() => { jogosEnviados.clear(); }, 3600000); 
setInterval(monitorarWinDrawWin, 300000); 
monitorarWinDrawWin();
