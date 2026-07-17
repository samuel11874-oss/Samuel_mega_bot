const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Captura Total'));
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
        console.log("Iniciando varredura bruta na página...");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 30000
        });

        const $ = cheerio.load(response.data);
        
        // Procura por qualquer texto que tenha ' x ' (formato universal de jogo)
        $('div, tr, span, td').each((i, el) => {
            const texto = $(el).text().trim();
            
            // Critério Único: Deve conter ' x ' e ser curto (tamanho de nome de jogo)
            if (texto.includes(' x ') && texto.length > 10 && texto.length < 150) {
                
                // Limpeza para evitar repetição de lixo visual
                const confronto = texto.replace(/\s+/g, ' ');

                if (!jogosEnviados.has(confronto)) {
                    jogosEnviados.add(confronto);
                    
                    // Dispara para o Telegram
                    bot.sendMessage(CHAT_ID, `⚽ ${confronto}`).catch(console.error);
                    console.log(`✅ Enviado: ${confronto}`);
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reseta o cache de jogos a cada 24 horas para não encher a memória
setInterval(() => { jogosEnviados.clear(); }, 86400000); 

// Varredura a cada 10 minutos
setInterval(monitorarJogos, 600000); 

// Primeira execução ao ligar
monitorarJogos();
