const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Filtro de Data Flexível'));
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
        
        let dataPermitida = false;

        // Itera sobre cabeçalhos (para definir a data) e linhas de jogo
        $('h1, h2, h3, tr').each((i, el) => {
            const texto = $(el).text().trim();
            const textoLower = texto.toLowerCase();

            // 1. Deteção de Data: Procura por 17 de Julho ou 17/07
            if (textoLower.includes('17') && (textoLower.includes('jul') || textoLower.includes('/07'))) {
                dataPermitida = true;
                return;
            }
            
            // 2. Bloqueio: Se encontrar qualquer outra data numérica (tipo 18/07 ou 16/07) ou dias da semana, trava
            if (dataPermitida && (
                (textoLower.includes('/') && !textoLower.includes('17/07')) ||
                (textoLower.includes('18') || textoLower.includes('16') || textoLower.includes('19'))
            )) {
                dataPermitida = false;
                return;
            }

            // 3. Captura: Se dataPermitida for true e for uma linha de jogo
            if (dataPermitida && $(el).is('tr') && texto.includes(' x ')) {
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
                        console.log(`✅ Enviado (Data Confirmada): ${confronto}`);
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Limpa cache diário
setInterval(() => { jogosEnviados.clear(); }, 86400000); 
// Varredura a cada 5 minutos
setInterval(monitorarJogos, 300000); 

monitorarJogos();
