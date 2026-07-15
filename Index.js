const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

// --- CONFIGURAÇÃO ---
const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU'; 
const CHAT_ID = '8285908313'; 
const bot = new TelegramBot(TOKEN, { polling: false });

const alertedGames = new Set(); 

async function monitorarJogos() {
    try {
        console.log("Analisando mercado...");
        // URL base: Usaremos o WinDrawWin como exemplo
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/');
        const $ = cheerio.load(data);

        // NOTA: Estes seletores dependem do site. Se não alertar, precisamos ajustar.
        $('.table-row').each((i, el) => {
            const timeCasa = $(el).find('.home-team').text().trim();
            const timeFora = $(el).find('.away-team').text().trim();
            const minuto = parseInt($(el).find('.minute').text());
            const apCasa = parseInt($(el).find('.ap-home').text());
            const apFora = parseInt($(el).find('.ap-away').text());
            
            if(!minuto || !apCasa) return; // Pula se não achar dados

            const totalAp = apCasa + apFora;
            const apMinuto = (totalAp / minuto).toFixed(2);
            const gameId = `${timeCasa}-${timeFora}`;

            // --- FILTROS INTELIGENTES ---
            if (minuto >= 15 && minuto <= 23 && apMinuto >= 1.2) {
                if (!alertedGames.has(gameId)) {
                    enviarAlerta(timeCasa, timeFora, minuto, apMinuto);
                    alertedGames.add(gameId);
                    setTimeout(() => alertedGames.delete(gameId), 3600000); // Reset após 1h
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
                `✅ *Entrar com cautela!*`;
    bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' });
}

setInterval(monitorarJogos, 60000);
monitorarJogos();
