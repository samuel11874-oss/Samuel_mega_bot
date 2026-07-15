const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot de Diagnóstico Total Ativo'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function monitorarJogos() {
    console.log("🔍 [DIAGNÓSTICO] Iniciando varredura...");
    
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/');
        const $ = cheerio.load(data);
        
        // Verifica quantos elementos ele encontrou
        const linhas = $('.table-row');
        console.log(`🔍 [DIAGNÓSTICO] Linhas encontradas na tabela: ${linhas.length}`);

        linhas.each((i, el) => {
            const timeCasa = $(el).find('.home-team').text().trim();
            const timeFora = $(el).find('.away-team').text().trim();
            const minuto = $(el).find('.minute').text().trim(); // Mantive como string para não filtrar nada
            const apCasa = $(el).find('.ap-home').text().trim();
            const apFora = $(el).find('.ap-away').text().trim();
            
            // Log detalhado para você ver o que ele está lendo
            console.log(`Jogo ${i}: ${timeCasa || "???"} x ${timeFora || "???"} | Min: ${minuto} | Esc: ${apCasa}x${apFora}`);

            // FILTRO TOTAL: Qualquer jogo que ele listar, envia
            if (timeCasa && timeFora) {
                enviarAlerta(timeCasa, timeFora, minuto, `${apCasa} x ${apFora}`);
            }
        });
    } catch (error) {
        console.error("❌ [Erro no Diagnóstico]:", error.message);
    }
}

function enviarAlerta(casa, fora, min, esc) {
    const msg = `🧪 *CAPTURA TOTAL* 🧪\n\n` +
                `⚽ *${casa} x ${fora}*\n` +
                `⏱️ Minuto: ${min}\n` +
                `⛳ Escanteios: ${esc}\n\n` +
                `✅ *O robô está lendo o site!*`;
    bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' });
}

setInterval(monitorarJogos, 60000); // Roda a cada 1 minuto
monitorarJogos();
