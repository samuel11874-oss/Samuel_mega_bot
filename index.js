const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Filtro Cirúrgico 10.6-15.0'));
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
        // Vamos focar apenas em linhas (tr) que contêm " x "
        $('tr').each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');

            if (linha.includes(' x ')) {
                // 1. Captura o confronto
                const regexConfronto = /([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/;
                const matchConfronto = linha.match(regexConfronto);
                const confronto = matchConfronto ? matchConfronto[0].replace(/Hoje/gi, '').trim() : null;

                // 2. Captura o número decimal (ex: 10.6, 11.2) - busca apenas no formato XX.X
                const matchNumero = linha.match(/(\d{2}[.,]\d)/);
                
                if (confronto && matchNumero) {
                    const valor = parseFloat(matchNumero[0].replace(',', '.'));

                    // 3. FILTRO DE PRECISÃO (O PULO DO GATO)
                    // Só envia se a média for maior que 10.5 E menor ou igual a 15.0
                    if (valor > 10.5 && valor <= 15.0 && !jogosEnviados.has(confronto)) {
                        jogosEnviados.add(confronto);

                        const mensagem = `⚽ *OPORTUNIDADE REAL*\n` +
                                         `━━━━━━━━━━━━━━\n` +
                                         `⚔️ *Confronto:* ${confronto}\n` +
                                         `📊 *Média FT:* ${valor.toFixed(1)}\n` +
                                         `━━━━━━━━━━━━━━`;

                        bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                        console.log(`✅ ENVIADO: ${confronto} | Média: ${valor}`);
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
