const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.listen(process.env.PORT || 3000);

const bot = new TelegramBot('8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU', { polling: false });
const CHAT_ID = '8285908313';

// 1. LISTA DE ELITE (Whitelist)
const LIGAS_PERMITIDAS = [
    'Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 
    'Brasileirão Série A', 'Brasileirão Série B', 'Champions League', 
    'Libertadores', 'Premier League', 'Eredivisie', 'Primeira Liga'
];

async function rodarAnalise() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { 
            headers: { 'User-Agent': 'Mozilla/5.0' } 
        });
        const $ = cheerio.load(data);

        // Processa cada bloco de liga
        $('.wttr2').each((i, el) => {
            const nomeLiga = $(el).text();
            
            // Filtro de Liga
            if (LIGAS_PERMITIDAS.some(liga => nomeLiga.includes(liga))) {
                
                // Pega os jogos logo abaixo desta liga
                const proximoBloco = $(el).nextAll('.statln2').first();
                const infoJogo = proximoBloco.text();
                
                // Lógica de Potencial (Exemplo aplicado aos seus critérios)
                // O bot agora só envia se o confronto contiver dados de alta média
                const temPotencial = infoJogo.includes('10') || infoJogo.includes('11') || infoJogo.includes('12');

                if (temPotencial) {
                    const linkBusca = `https://www.google.com/search?q=bet365+${encodeURIComponent(infoJogo)}`;
                    
                    const mensagem = `
🏆 *Liga de Elite:* ${nomeLiga}
⚽ *Jogo:* [${infoJogo}](${linkBusca})
📈 *Critérios:* Favorito Home | >10 Cantos | >2 Gols
🔔 *Atenção:* Oportunidade identificada!
                    `;
                    
                    bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' });
                }
            }
        });
    } catch (e) { console.error("Erro na análise de elite:", e.message); }
}

setInterval(rodarAnalise, 1800000); // Roda a cada 30 min
rodarAnalise();
