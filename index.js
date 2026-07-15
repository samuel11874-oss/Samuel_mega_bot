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

async function monitorarJogos() {
    // --- NOVO LOG: Avisa que começou ---
    console.log("🔍 [Monitoramento] Iniciando varredura no WinDrawWin...");
    
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/');
        const $ = cheerio.load(data);
        
        let contagemJogos = 0;
        $('.table-row').each((i, el) => {
            const timeCasa = $(el).find('.home-team').text().trim();
            const timeFora = $(el).find('.away-team').text().trim();
            const liga = $(el).find('.league-name').text().trim();
            const minuto = parseInt($(el).find('.minute').text());
            const apCasa = parseInt($(el).find('.ap-home').text());
            const apFora = parseInt($(el).find('.ap-away').text());
            
            if(!minuto || isNaN(apCasa)) return; 
            
            contagemJogos++;
            const totalEscanteios = apCasa + apFora;
            const tituloCompleto = `${timeCasa} ${timeFora} ${liga}`.toLowerCase();
            const gameId = `${timeCasa}-${timeFora}`;

            if (blacklist.some(termo => tituloCompleto.includes(termo))) return;

            // Filtros de Oportunidade
            if ((minuto >= 34 && minuto <= 43 && totalEscanteios >= 3) || 
                (minuto >= 75 && minuto <= 85 && totalEscanteios >= 8)) {
                
                if (!alertedGames.has(gameId)) {
                    console.log(`✅ [Alerta Encontrado] ${timeCasa} x ${timeFora} - ${minuto}'`);
                    enviarAlerta(timeCasa, timeFora, minuto, totalEscanteios);
                    alertedGames.add(gameId);
                    setTimeout(() => alertedGames.delete(gameId), 3600000); 
                }
            }
        });
        
        // --- NOVO LOG: Avisa que terminou ---
        console.log(`✅ [Monitoramento] Concluído. Analisados ${contagemJogos} jogos.`);
        
    } catch (error) {
        console.error("❌ [Erro no Monitoramento]:", error.message);
    }
}

function enviarAlerta(casa, fora, min, esc) {
    const msg = `🚨 *OPORTUNIDADE DETECTADA* 🚨\n\n` +
                `⚽ *${casa} x ${fora}*\n` +
                `⏱️ Minuto: ${min}'\n` +
                `⛳ Total Escanteios: ${esc}\n\n` +
                `✅ *Critérios atendidos.*`;
    bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' });
}

// Loop principal (roda a cada 1 minuto)
setInterval(monitorarJogos, 60000);
monitorarJogos();
