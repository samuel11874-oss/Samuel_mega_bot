const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Modo Móvel Ativo'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Identificação de iPhone (isso força o site a enviar a versão simples)
const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9',
    'Referer': 'https://www.google.com/'
};

async function monitorarJogos() {
    console.log("--------------------------------------------------");
    console.log("[MODO MÓVEL] Tentando acesso pela versão leve do site...");

    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        const $ = cheerio.load(data);
        let encontrados = 0;

        // Versão simples: pegamos todos os links ou linhas que contenham " x "
        $('tr, div, li').each((i, el) => {
            const texto = $(el).text().trim().replace(/\s+/g, ' ');
            
            if (texto.includes(' x ') && (texto.includes('10.') || texto.includes('11.'))) {
                encontrados++;
                if (encontrados <= 5) { // Mostra só os 5 primeiros para não encher o log
                    console.log(`[JOGO DETECTADO]: ${texto.substring(0, 100)}`);
                    bot.sendMessage(CHAT_ID, `⚽ Jogo detectado: ${texto.substring(0, 100)}...`).catch(console.error);
                }
            }
        });

        console.log(`[FIM] Total de linhas com formato de jogo encontradas: ${encontrados}`);
        
    } catch (e) {
        console.error("Erro na varredura móvel:", e.message);
    }
}

setInterval(monitorarJogos, 900000); 
monitorarJogos();
