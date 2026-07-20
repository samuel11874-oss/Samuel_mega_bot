const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Identidade iPhone Ativa'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Cabeçalho de iPhone (iOS 17) para maior compatibilidade
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://www.forebet.com/pt/'
};

let jogosEnviados = new Set();

async function monitorarJogos() {
    try {
        console.log("Conectando ao Forebet via iPhone...");
        const { data } = await axios.get('https://www.forebet.com/pt/predictions-for-today/corners', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let encontrados = 0;
        
        // O Forebet pode mudar a estrutura para celular. Vamos buscar 'div' com classes comuns de jogos
        $('div.match').each((i, el) => {
            const texto = $(el).text().trim().replace(/\s+/g, ' ');
            
            if (texto.includes('-') || texto.includes('x')) {
                console.log(`JOGO IDENTIFICADO: ${texto}`);
                encontrados++;
                
                const chave = texto.substring(0, 30).toLowerCase();
                if (!jogosEnviados.has(chave)) {
                    jogosEnviados.add(chave);
                    const msg = `⚽ *Oportunidade (Forebet - iPhone)*\n\n${texto}`;
                    bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                }
            }
        });

        if (encontrados === 0) {
            console.log("⚠️ Nenhum jogo identificado. O Forebet pode ter mudado a estrutura para celular.");
        }

    } catch (e) {
        console.error("Erro na conexão:", e.message);
    }
}

setInterval(() => { jogosEnviados.clear(); }, 3600000); 
setInterval(monitorarJogos, 300000); 
monitorarJogos();
