const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

// --- SERVIDOR ---
const app = express();
app.get('/', (req, res) => res.send('Bot de Escanteios Online'));
app.listen(process.env.PORT || 3000);

// --- CONFIGURAÇÃO ---
const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const alertedGames = new Set(); 

// --- LÓGICA DE MONITORAMENTO ---
async function monitorarJogos() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/');
        const $ = cheerio.load(data);
        
        $('.table-row').each((i, el) => {
            const timeCasa = $(el).find('.home-team').text().trim();
            const timeFora = $(el).find('.away-team').text().trim();
            const minuto = parseInt($(el).find('.minute').text());
            const apCasa = parseInt($(el).find('.ap-home').text());
            const apFora = parseInt($(el).find('.ap-away').text());
            
            if(!minuto || isNaN(apCasa)) return; 
            
            const totalEscanteios = apCasa + apFora;
            const gameId = `${timeCasa}-${timeFora}`;

            // --- FILTRO DE OPORTUNIDADE ---
            // 1. HT: Minuto 35 a 43 E pelo menos 3 escanteios
            if (minuto >= 35 && minuto <= 43 && totalEscanteios >= 3) {
                if (!alertedGames.has(gameId)) {
                    enviarAlerta(timeCasa, timeFora, minuto, totalEscanteios, "HT (35'-43')");
                    alertedGames.add(gameId);
                    // Bloqueia esse jogo por 1 hora
                    setTimeout(() => alertedGames.delete(gameId), 3600000); 
                }
            }

            // 2. FT: O robô monitora a partir dos 80' para ver se bateu 8 escanteios
            if (minuto >= 80 && totalEscanteios >= 8) {
                if (!alertedGames.has(gameId + "-FT")) {
                    enviarAlerta(timeCasa, timeFora, minuto, totalEscanteios, "FT (Final)");
                    alertedGames.add(gameId + "-FT");
                    setTimeout(() => alertedGames.delete(gameId + "-FT"), 3600000); 
                }
            }
        });
    } catch (error) {
        console.error("Erro na leitura:", error.message);
    }
}

function enviarAlerta(casa, fora, min, esc, tipo) {
    const msg = `🚨 *OPORTUNIDADE ${tipo}* 🚨\n\n` +
                `⚽ *${casa} x ${fora}*\n` +
                `⏱️ Minuto: ${min}'\n` +
                `⛳ Total Escanteios: ${esc}\n\n` +
                `⚠️ *Verifique:* Favorito está empatando/perdendo? Chance de gols alta?`;
    bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' });
}

// Loop principal (roda a cada 1 minuto)
setInterval(monitorarJogos, 60000);
monitorarJogos();
