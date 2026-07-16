const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Online e Simulando Navegador'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Cabeçalhos que simulam um navegador real (Chrome no Windows)
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://www.google.com/',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
};

async function monitorarJogos() {
    console.log("--------------------------------------------------");
    console.log("[INICIANDO BUSCA] Tentando acesso via simulador de navegador...");
    
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: HEADERS,
            timeout: 10000
        });
        
        const $ = cheerio.load(data);
        let encontrados = 0;
        let enviados = 0;

        $('div.statln').each((i, el) => {
            const texto = $(el).text().trim();
            
            if (texto.includes(' x ')) {
                encontrados++;
                
                const match = texto.match(/(.+?)\s+x\s+(.+?)\s+(\d{1,2}(?:\.\d{1,2})?)/);
                
                if (match) {
                    const timeA = match[1].trim();
                    const timeB = match[2].trim();
                    const media = parseFloat(match[3]);
                    
                    if (media > 10.5) {
                        enviados++;
                        bot.sendMessage(CHAT_ID, `🔥 *Oportunidade:* ${timeA} x ${timeB} | Média: ${media} Cantos`).catch(console.error);
                        console.log(`[ALERTA ENVIADO] ${timeA} x ${timeB} -> ${media}`);
                    }
                }
            }
        });

        console.log(`[FIM DA VARREDURA] Total encontrados: ${encontrados} | Enviados: ${enviados}`);
    } catch (e) {
        console.error("Erro na varredura (Verifique o acesso):", e.message);
    }
}

// Roda a cada 10 minutos
setInterval(monitorarJogos, 600000); 
monitorarJogos();
