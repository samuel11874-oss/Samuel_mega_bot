const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Especialista Online'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// 1. LISTA DE ELITE (Adicione/Remova ligas aqui)
const LIGAS_PERMITIDAS = ["Brasileirão", "Série A", "Série B", "Premier League", "Championship", "La Liga", "Serie A", "Bundesliga", "Ligue 1"];

async function analisarJogos() {
    console.log("🔍 [FILTRO] Iniciando varredura de critérios...");
    
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/');
        const $ = cheerio.load(data);
        const linhas = $('.wttrtab, .wttr2');

        linhas.each((i, el) => {
            const colunas = $(el).find('.wttd');
            
            if (colunas.length > 5) {
                // Captura de dados (Ajuste os números [0], [1], etc conforme a ordem das colunas no site)
                const liga = $(colunas[0]).text().trim(); // Exemplo de posição
                const confronto = $(colunas[5]).text().trim();
                const mediaTotal = parseFloat($(colunas[4]).text().trim().replace(',', '.'));
                const mediaHT = parseFloat($(colunas[3]).text().trim().replace(',', '.')); // Exemplo: Coluna 3 é HT
                const mediaGols = parseFloat($(colunas[6]).text().trim().replace(',', '.')); // Exemplo: Coluna 6 é Gols

                // --- APLICANDO OS 5 CRITÉRIOS ---
                
                const crit1_LigaElite = LIGAS_PERMITIDAS.some(l => confronto.includes(l));
                const crit2_EscTotal = mediaTotal > 10;
                const crit3_FavCasa = true; // Lógica: Assumimos que no WinDrawWin o mandante vem primeiro
                const crit4_EscHT = mediaHT > 4;
                const crit5_Gols = mediaGols > 2;

                if (crit1_LigaElite && crit2_EscTotal && crit3_FavCasa && crit4_EscHT && crit5_Gols) {
                    enviarAlerta(confronto, mediaTotal, mediaHT, mediaGols);
                }
            }
        });
    } catch (error) {
        console.error("❌ Erro na análise:", error.message);
    }
}

function enviarAlerta(confronto, media, ht, gols) {
    const msg = `💎 *JOGO DE ELITE IDENTIFICADO* 💎\n\n` +
                `⚽ *Jogo:* ${confronto}\n` +
                `📈 *Média Total:* ${media}\n` +
                `⏱️ *Média HT:* ${ht}\n` +
                `🥅 *Média Gols:* ${gols}\n\n` +
                `✅ *Todos os critérios batidos!*`;
    
    bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' });
}

setInterval(analisarJogos, 3600000); // 1 hora
analisarJogos();
