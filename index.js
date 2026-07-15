const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

// --- CONFIGURAÇÃO ---
const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Servidor fantasma para atender o requisito de porta do Render
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot de Escanteios Online');
}).listen(process.env.PORT || 3000);

const alertedGames = new Set(); 

async function monitorarJogos() {
    try {
        console.log("Analisando mercado...");
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/');
        const $ = cheerio.load(data);

        $('.table-row').each((i, el) => {
            const timeCasa = $(el).find('.home-team').text().trim();
            const timeFora = $(el).find('.away-team').text().trim();
            const minuto = parseInt($(el).find('.minute').text());
            const apCasa = parseInt($(el).find('.ap-home').text());
            const apFora = parseInt($(el).find('.ap-away').text());
            
            if(!minuto || isNaN(apCasa)) return; 

            const totalAp = apCasa + apFora;
            const apMinuto = (totalAp / minuto).toFixed(2);
            const gameId = `${timeCasa}-${timeFora}`;

            // --- FILTROS INTELIGENTES ---
            if (minuto >= 15 && minuto <= 23 && apMinuto >= 1.2) {
                if (!alertedGames.has(gameId)) {
                    enviarAlerta(timeCasa, timeFora, minuto, apMinuto);
                    alertedGames.add(gameId);
                    setTimeout(() => alertedGames.delete(gameId), 3600000); 
                }
            }
        });
    } catch (error) {
        console.error("Erro ao ler site:", error.message);
    }
}

function enviarAlerta(casa, fora, min, ap) {
    const msg = `🚨 *OPORTUNIDADE HT ENCONTRADA* 🚨\n\n` +
                `⚽ *${casa} x ${fora}*\n` +
                `⏱️ Minuto: ${min}'\n` +
                `📈 Pressão: ${ap} AP/Min\n\n` +
                `✅ *Analisado pelo Robô Samuel*`;
    bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' });
}

// Roda a verificação a cada 60 segundos
setInterval(monitorarJogos, 60000);
monitorarJogos();
