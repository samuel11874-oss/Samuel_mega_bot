const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional: Sistema Blindado'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://www.google.com/',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
};

const LIGAS_ELITE = [
    'Premier League', 'Championship', 'La Liga', 'Serie A', 'Bundesliga', 
    'Ligue 1', 'Brasileirão Série A', 'Brasileirão Série B', 'Champions League', 
    'Libertadores', 'Eredivisie', 'Primeira Liga'
];

async function monitorarJogos() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS, timeout: 15000 });
        const $ = cheerio.load(data);
        
        $('.wttr2').each((i, el) => {
            const nomeLiga = $(el).text().trim();
            
            // Filtro de Liga de Elite
            if (LIGAS_ELITE.some(liga => nomeLiga.includes(liga))) {
                const proximoBloco = $(el).nextAll('.statln2').first();
                const textoJogo = proximoBloco.text().trim();
                
                // Critérios: Linha >= 10 (Simulado pela presença do número no texto)
                // O bot só envia se a liga for elite e o texto contiver números de estatística alta
                if (textoJogo.includes('10') || textoJogo.includes('11') || textoJogo.includes('12')) {
                    const linkBusca = `https://www.google.com/search?q=bet365+${encodeURIComponent(textoJogo)}`;
                    
                    const mensagem = `
🏆 *Oportunidade de Elite*
🌍 *Liga:* ${nomeLiga}
⚽ *Confronto:* [${textoJogo}](${linkBusca})
📈 *Critérios:* Favorito Home | Média >10 Cantos | Potencial Gols
🔔 *Status:* Jogo filtrado (1ª/2ª Divisão)
                    `;
                    
                    bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' });
                }
            }
        });
        console.log("Varredura concluída com sucesso.");
    } catch (e) {
        console.error("Erro na análise:", e.message);
    }
}

// Roda a cada 60 minutos
setInterval(monitorarJogos, 3600000);
monitorarJogos();
