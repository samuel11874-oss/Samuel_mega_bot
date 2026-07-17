const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Corte Exato'));
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
        
        // Convertemos as linhas em um array para controlar o fluxo de leitura
        const rows = $('tr').toArray();
        let capturando = false;

        for (let el of rows) {
            const linhaTexto = $(el).text().trim().toLowerCase();

            // 1. Início: Quando encontrar "hoje", ativamos a captura
            if (linhaTexto.includes('hoje')) {
                capturando = true;
                continue; // Pula a linha do cabeçalho
            }

            // 2. Fim: Se estivermos capturando e encontrar qualquer outra data, paramos imediatamente
            if (capturando && (linhaTexto.includes('amanhã') || linhaTexto.includes('próximo') || linhaTexto.includes('/') || linhaTexto.includes('segunda') || linhaTexto.includes('terça') || linhaTexto.includes('quarta') || linhaTexto.includes('quinta') || linhaTexto.includes('sexta') || linhaTexto.includes('sábado') || linhaTexto.includes('domingo'))) {
                capturando = false;
                break; // Sai do loop, não lê mais nada
            }

            // 3. Processamento: Apenas se estiver na zona "Hoje" e tiver jogo
            if (capturando && linhaTexto.includes(' x ')) {
                const match = $(el).text().trim().match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                
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
        }
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(() => { jogosEnviados.clear(); }, 86400000); 
setInterval(monitorarJogos, 300000); 

monitorarJogos();
