const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - SoccerStats Ativo'));
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
        "Athletic": "🇧🇷", "Malmo": "🇸🇪", "Kalmar": "🇸🇪", "Hacken": "🇸🇪", "AIK": "🇸🇪",
        "Lahti": "🇫🇮", "Mariehamn": "🇫🇮", "KuPS": "🇫🇮", "VPS": "🇫🇮", "Gnistan": "🇫🇮"
    };
    return list[teamName] || "🏳️";
}

function ehDataFutura(texto) {
    const dataAtual = 19; 
    const match = texto.match(/(\d{1,2})\s+de\s+julho/i);
    if (match && parseInt(match[1]) > dataAtual) return true;
    if (/amanhã|tomorrow|segunda|terça|quarta|quinta|sexta|sábado|domingo/i.test(texto)) {
        if (!/hoje/i.test(texto)) return true;
    }
    return false;
}

async function monitorarJogos() {
    try {
        // URL ajustada para o SoccerStats (Brasil como exemplo)
        const { data } = await axios.get('https://www.soccerstats.com/results.asp?league=brazil&pmtype=corners', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let encontrados = 0;

        // O SoccerStats é focado em tabelas (tr)
        $('tr').each((i, el) => {
            let texto = $(el).text().trim();
            
            // CONVERSÃO DE FORMATO: Transforma "Time A v Time B" em "Time A x Time B"
            texto = texto.replace(/\s+v\s+/i, ' x ');
            
            if (ehDataFutura(texto)) return;

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
                            encontrados++;

                            const t1 = match[1].trim();
                            const t2 = match[2].trim();
                            const bandeira = getBandeira(t1);
                            
                            const msg = `⚽ *Oportunidade (SoccerStats)*\n\n` +
                                        `${bandeira} *${t1} x ${t2}*\n` +
                                        `⛳ *Média de escanteio FT: ${media.toFixed(1)}*`;
                            
                            bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                            console.log(`✅ ENVIADO: ${t1} x ${t2}`);
                        }
                    }
                }
            }
        });
        
        console.log(`🔍 Varredura SoccerStats concluída. Jogos válidos encontrados: ${encontrados}`);
    } catch (e) {
        console.error("Erro na busca (SoccerStats):", e.message);
    }
}

setInterval(() => { jogosEnviados.clear(); }, 3600000); 
setInterval(monitorarJogos, 300000); 
monitorarJogos();
