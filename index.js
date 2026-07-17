const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Data Bloqueada'));
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
        
        let isToday = false;

        // Agora percorremos as linhas (tr) e não os links (a)
        $('tr').each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');

            // 1. Detecta o cabeçalho de "Hoje"
            if (linha.toLowerCase().includes('hoje')) {
                isToday = true;
                return;
            }

            // 2. Detecta se a data mudou (Amanhã ou datas como 18/07)
            if (linha.toLowerCase().includes('amanhã') || /\d{1,2}\/\d{1,2}/.test(linha)) {
                isToday = false;
                return;
            }

            // 3. Se estiver na seção "Hoje" e for um jogo (contém " x "), enviamos
            if (isToday && linha.includes(' x ')) {
                const regexConfronto = /([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/;
                const match = linha.match(regexConfronto);
                
                if (match) {
                    const confronto = match[0].trim();

                    if (!jogosEnviados.has(confronto)) {
                        jogosEnviados.add(confronto);

                        const mensagem = `⚽ *JOGO DE HOJE*\n` +
                                         `*Confronto:* ${confronto}`;

                        bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                        console.log(`✅ Enviado (Data Bloqueada Hoje): ${confronto}`);
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Limpa cache diariamente
setInterval(() => { jogosEnviados.clear(); }, 86400000); 

// Varredura a cada 5 minutos
setInterval(monitorarJogos, 300000); 

monitorarJogos();
