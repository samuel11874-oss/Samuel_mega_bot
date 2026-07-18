const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Filtro 10.5+'));
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
        const elementos = $('div, tr, li, td');

        elementos.each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');

            if (linha.includes(' x ')) {
                const regexConfronto = /([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/;
                const matchConfronto = linha.match(regexConfronto);
                const confronto = matchConfronto ? matchConfronto[0].trim() : null;

                // Captura a média
                const numeros = linha.match(/\d{1,2}\.\d/g);
                const valorString = numeros ? numeros[0] : "0";
                const valorFloat = parseFloat(valorString);

                // FILTRO: Apenas jogos com média > 10.5
                if (confronto && valorFloat > 10.5 && !jogosEnviados.has(confronto)) {
                    jogosEnviados.add(confronto);

                    const mensagem = `⚽ *OPORTUNIDADE ENCONTRADA*\n` +
                                     `━━━━━━━━━━━━━━\n` +
                                     `⚔️ *Confronto:* ${confronto}\n` +
                                     `📊 *Média FT:* ${valorFloat}\n` +
                                     `━━━━━━━━━━━━━━`;

                    bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                    console.log(`✅ Enviado: ${confronto} | Média: ${valorFloat}`);
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
