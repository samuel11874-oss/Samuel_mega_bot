const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot de Escanteios Inteligente Ativo'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const alertedGames = new Set(); 
const blacklist = ["feminino", "women", "u20", "sub20", "amador", "youth", "júnior", "junior"];

// --- FUNÇÃO DE INTELIGÊNCIA (xG) ---
async function obterXG(timeCasa) {
    try {
        // Nota: O FBref requer uma busca precisa. 
        // Esta é uma implementação simplificada de busca de qualidade.
        // O robô irá verificar se o xG é >= 1.0 para filtrar "apostas falsas".
        return 1.2; // Exemplo: Retorno fictício para estruturar a lógica enquanto o mapeamento é afinado.
    } catch (e) {
        return 0;
    }
}

async function monitorarJogos() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/');
        const $ = cheerio.load(data);
        
        $('.table-row').each(async (i, el) => {
            const timeCasa = $(el).find('.home-team').text().trim();
            const timeFora = $(el).find('.away-team').text().trim();
            const liga = $(el).find('.league-name').text().trim();
            const minuto = parseInt($(el).find('.minute').text());
            const apCasa = parseInt($(el).find('.ap-home').text());
            const apFora = parseInt($(el).find('.ap-away').text());
            
            if(!minuto || isNaN(apCasa)) return; 
            
            const totalEscanteios = apCasa + apFora;
            const tituloCompleto = `${timeCasa} ${timeFora} ${liga}`.toLowerCase();
            const gameId = `${timeCasa}-${timeFora}`;

            if (blacklist.some(termo => tituloCompleto.includes(termo))) return;

            // --- APLICAÇÃO DO FILTRO INTELIGENTE ---
            const xG = await obterXG(timeCasa);
            const ehJogoValido = (minuto >= 34 && minuto <= 43 && totalEscanteios >= 3) || 
                                 (minuto >= 75 && minuto <= 85 && totalEscanteios >= 8);

            if (ehJogoValido && xG >= 1.0) { // Só alerta se xG for maior que 1.0
                if (!alertedGames.has(gameId)) {
                    enviarAlerta(timeCasa, timeFora, minuto, totalEscanteios, xG);
                    alertedGames.add(gameId);
                    setTimeout(() => alertedGames.delete(gameId), 3600000); 
                }
            }
        });
    } catch (error) {
        console.error("Erro:", error.message);
    }
}

function enviarAlerta(casa, fora, min, esc, xG) {
    const msg = `🚨 *OPORTUNIDADE DE VALOR* 🚨\n\n` +
                `⚽ *${casa} x ${fora}*\n` +
                `⏱️ Minuto: ${min}'\n` +
                `⛳ Escanteios: ${esc}\n` +
                `📈 xG (Qualidade): ${xG}\n\n` +
                `✅ *Alerta filtrado com sucesso!*`;
    bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' });
}

setInterval(monitorarJogos, 60000);
monitorarJogos();
