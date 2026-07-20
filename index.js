const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Modo Limpeza Ativo'));
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
        "Lahti": "🇫🇮", "Mariehamn": "🇫🇮", "Gnistan": "🇫🇮"
    };
    return list[teamName] || "🏳️";
}

async function monitorarJogos() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        $('div').each((i, el) => {
            const texto = $(el).text().trim();

            // 1. FILTRO ANTI-LIXO: Bloqueia qualquer coisa que pareça menu/título
            const lixo = ["WinDrawWin", "Palpites", "Jogos", "Estatísticas", "Página", "Total", "Próxima", "Brasileirão", "Mais", "Menos"];
            const contemLixo = lixo.some(termo => texto.includes(termo));
            
            // 2. FILTRO DE FORMATO: Precisa de " x " e não pode conter lixo
            // E vamos procurar por um padrão de time (letras) + x + time (letras)
            if (texto.includes(' x ') && !contemLixo && texto.length < 60) {
                
                const match = texto.match(/([A-Za-zÀ-ÿ\s]{3,})\s?x\s?([A-Za-zÀ-ÿ\s]{3,})/i);
                
                if (match) {
                    const t1 = match[1].trim();
                    const t2 = match[2].trim();
                    const chave = (t1 + t2).toLowerCase().replace(/\s/g, '');
                    
                    // Só envia se for inédito
                    if (!jogosEnviados.has(chave)) {
                        jogosEnviados.add(chave);
                        
                        const msg = `⚽ *Oportunidade encontrada*\n\n` +
                                    `${getBandeira(t1)} *${t1} x ${t2}*\n` +
                                    `⛳ *Média: FT (Verificar no site)*`;
                        
                        bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                        console.log(`✅ ENVIADO (LIMPO): ${t1} x ${t2}`);
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(() => { jogosEnviados.clear(); }, 3600000); 
setInterval(monitorarJogos, 300000); 
monitorarJogos();
