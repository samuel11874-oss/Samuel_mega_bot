const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Filtro Rígido'));
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
        
        let podeEnviar = false;

        $('tr').each((i, el) => {
            const linhaTexto = $(el).text().trim();
            const linhaNormalizada = linhaTexto.toLowerCase();

            // 1. Detecta início do bloco "Hoje"
            if (linhaNormalizada.includes('hoje')) {
                podeEnviar = true;
                return;
            }

            // 2. Trava o envio se detectar data futura (Amanhã ou nomes de meses/dias)
            if (linhaNormalizada.includes('amanhã') || linhaNormalizada.includes('segunda') || linhaNormalizada.includes('terça') || linhaNormalizada.includes('quarta') || linhaNormalizada.includes('quinta') || linhaNormalizada.includes('sexta') || linhaNormalizada.includes('sábado') || linhaNormalizada.includes('domingo')) {
                podeEnviar = false;
                return;
            }

            // 3. Se estiver no bloco de "Hoje" e for uma linha de jogo (" x "), envia
            if (podeEnviar && linhaTexto.includes(' x ')) {
                const match = linhaTexto.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                
                if (match) {
                    const confronto = match[0].trim();

                    if (!jogosEnviados.has(confronto)) {
                        jogosEnviados.add(confronto);

                        const mensagem = `⚽ *JOGO DE HOJE*\n` +
                                         `━━━━━━━━━━━━━━\n` +
                                         `*Partida:* ${confronto}\n` +
                                         `━━━━━━━━━━━━━━`;

                        bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                        console.log(`✅ Enviado: ${confronto}`);
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
