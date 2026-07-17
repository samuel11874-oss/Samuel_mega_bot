const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Modo Amplo'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

async function monitorarJogos() {
    try {
        console.log("--- Varredura Ampla Iniciada ---");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        
        $('div').each((i, el) => {
            const texto = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Filtro mais simples: apenas tem que ser um jogo com " x "
            if (texto.includes(' x ') && texto.length < 200) {
                
                // Log de Debug: Mostra tudo o que ele encontra
                console.log(`🔎 Analisando: ${texto.substring(0, 60)}...`);

                const matchNumeros = texto.match(/(\d{1,2}\.?\d?)/);
                
                if (matchNumeros) {
                    const media = parseFloat(matchNumeros[0]);
                    
                    if (media > 11 && media <= 25) { 
                        const matchConfronto = texto.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                        
                        if (matchConfronto) {
                            const confronto = matchConfronto[0].trim();
                            const msg = `⚽ *OPORTUNIDADE*\n\n` +
                                        `⚔️ *Confronto:* ${confronto}\n` +
                                        `📊 *Média:* ${media}\n\n` +
                                        `🚀 _Samuel Mega Bot_`;
                                        
                            bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(console.error);
                            console.log(`✅ Jogo encontrado e enviado: ${confronto} | Média: ${media}`);
                        }
                    }
                }
            }
        });
        console.log("--- Varredura Finalizada ---");
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(monitorarJogos, 600000); 
monitorarJogos();
