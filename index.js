const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot de Escanteios - Filtro Hoje'));
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
        console.log("--- Iniciando Varredura (Somente Hoje) ---");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        
        $('div').each((i, el) => {
            const texto = $(el).text().trim().replace(/\s+/g, ' ');
            
            // 1. Filtro: Deve conter "Hoje", " x " e não ser cabeçalho
            if (texto.includes('Hoje') && texto.includes(' x ') && !texto.includes('ESTATÍSTICAS')) {
                
                // 2. Extração: Procura um número decimal (ex: 10.5)
                const matchMedia = texto.match(/(\d{1,2}\.\d)/);
                
                if (matchMedia) {
                    const media = parseFloat(matchMedia[0]);
                    
                    // 3. Filtro de Média > 11
                    if (media > 11) {
                        const matchConfronto = texto.match(/Hoje([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/i);
                        
                        if (matchConfronto) {
                            const confronto = matchConfronto[0].replace('Hoje', '').trim();
                            
                            if (!jogosEnviados.has(confronto)) {
                                jogosEnviados.add(confronto);
                                
                                // Card Organizado
                                const msg = `⚽ *JOGO DO DIA*\n\n` +
                                            `⚔️ *Confronto:* ${confronto}\n` +
                                            `📊 *Média de Escanteios:* ${media}\n\n` +
                                            `🚀 _Análise enviada via Samuel Mega Bot_`;
                                            
                                bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(console.error);
                                console.log(`✅ Enviado: ${confronto} | Média: ${media}`);
                            }
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
