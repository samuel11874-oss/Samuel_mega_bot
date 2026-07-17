const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot de Precisão Operacional'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

let jogosEnviados = new Set();

async function monitorarJogos() {
    try {
        console.log("--- Varredura de Precisão (16/07 e 17/07) ---");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 20000
        });

        const $ = cheerio.load(response.data);
        
        $('div').each((i, el) => {
            const texto = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Busca específica por datas 16/07 (Hoje) ou 17/07 (Amanhã)
            if ((texto.includes('16/07') || texto.includes('17/07')) && texto.includes(' x ')) {
                
                const matchNumeros = texto.match(/(\d{1,2}\.?\d?)/);
                
                if (matchNumeros) {
                    const media = parseFloat(matchNumeros[0]);
                    
                    if (media > 11) {
                        const matchConfronto = texto.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                        
                        if (matchConfronto) {
                            const confronto = matchConfronto[0].trim();
                            const dataEncontrada = texto.includes('16/07') ? '16/07 (Hoje)' : '17/07 (Amanhã)';
                            
                            if (!jogosEnviados.has(confronto)) {
                                jogosEnviados.add(confronto);
                                
                                const msg = `⚽ *ALERTA DE OPORTUNIDADE*\n\n` +
                                            `📅 *Data:* ${dataEncontrada}\n` +
                                            `⚔️ *Confronto:* ${confronto}\n` +
                                            `📊 *Média:* ${media}\n\n` +
                                            `🚀 _Samuel Mega Bot_`;
                                            
                                bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(console.error);
                                console.log(`✅ Jogo encontrado: ${confronto} | ${dataEncontrada} | ${media}`);
                            }
                        }
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Roda a cada 10 minutos
setInterval(monitorarJogos, 600000); 
monitorarJogos();
