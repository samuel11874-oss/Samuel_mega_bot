const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Data Exata 17/07'));
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
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 20000
        });

        const $ = cheerio.load(response.data);
        
        let dataAtual = ""; // Armazena a data que o bot está lendo no momento

        // Percorre tudo o que pode ser um cabeçalho ou linha
        $('h1, h2, h3, tr').each((i, el) => {
            const texto = $(el).text().trim();
            
            // 1. Detecção de Data: Verifica se a linha contém "17/07"
            if (texto.includes('17/07')) {
                dataAtual = "17/07";
                return; // Pula a linha do cabeçalho
            } 
            // Se encontrar outra data (ex: 18/07, 16/07), muda o ponteiro e para de capturar
            else if (/\d{2}\/\d{2}/.test(texto) && !texto.includes('17/07')) {
                dataAtual = "OUTRA_DATA";
                return;
            }

            // 2. Captura: Só captura se a data for 17/07 e for uma linha de jogo
            if (dataAtual === "17/07" && $(el).is('tr') && texto.includes(' x ')) {
                const match = texto.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                
                if (match) {
                    const confronto = match[0].trim();

                    if (!jogosEnviados.has(confronto)) {
                        jogosEnviados.add(confronto);

                        const mensagem = `⚽ *JOGO DE HOJE (17/07)*\n` +
                                         `━━━━━━━━━━━━━━\n` +
                                         `*Partida:* ${confronto}\n` +
                                         `━━━━━━━━━━━━━━`;

                        bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                        console.log(`✅ Enviado (17/07): ${confronto}`);
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(() => { jogosEnviados.clear(); }, 86400000); 
setInterval(monitorarJogos, 300000); 

monitorarJogos();
