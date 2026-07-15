const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot de Escanteios Online'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const alertedGames = new Set(); 

// Lista de exclusão (Filtro de "lixo" para o bot)
const blacklist = ["feminino", "women", "u20", "sub20", "amador", "youth", "júnior", "junior"];

async function monitorarJogos() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/');
        const $ = cheerio.load(data);
        
        $('.table-row').each((i, el) => {
            const timeCasa = $(el).find('.home-team').text().trim();
            const timeFora = $(el).find('.away-team').text().trim();
            const liga = $(el).find('.league-name').text().trim(); // Tenta ler a liga
            const minuto = parseInt($(el).find('.minute').text());
            const apCasa = parseInt($(el).find('.ap-home').text());
            const apFora = parseInt($(el).find('.ap-away').text());
            
            if(!minuto || isNaN(apCasa)) return; 
            
            const totalEscanteios = apCasa + apFora;
            const tituloCompleto = `${timeCasa} ${timeFora} ${liga}`.toLowerCase();
            const gameId = `${timeCasa}-${timeFora}`;

            // 1. FILTRO DE EXCLUSÃO (Não quero Feminino, Sub20, etc)
            if (blacklist.some(termo => tituloCompleto.includes(termo))) return;

            // 2. FILTRO HT (34' a 43' E >= 3 escanteios)
            if (minuto >= 34 && minuto <= 43 && totalEscanteios >= 3) {
                if (!alertedGames.has(gameId + "-HT")) {
                    enviarAlerta(timeCasa, timeFora, minuto, totalEscanteios, "HT (34'-43')");
                    alertedGames.add(gameId + "-HT");
                    setTimeout(() => alertedGames.delete(gameId + "-HT"), 3600000); 
                }
            }

            // 3. FILTRO FT (75' a 85' E >= 8 escanteios)
            if (minuto >= 75 && minuto <= 85 && totalEscanteios >= 8) {
                if (!alertedGames.has(gameId + "-FT")) {
                    enviarAlerta(timeCasa, timeFora, minuto, totalEscanteios, "FT (75'-85')");
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
                `✅ *Critérios atendidos: Minuto e Volume.*`;
    bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' });
}

setInterval(monitorarJogos, 60000);
monitorarJogos();
