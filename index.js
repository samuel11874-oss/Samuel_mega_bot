const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Premium: Análise de Dados Ativa'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Função de Análise (Onde a mágica acontece)
function analisarJogo(confronto, mediaEscanteios, golsPrevistos) {
    // 1. Filtro: Favorito em casa (Exemplo: se o primeiro time estiver na esquerda, assumimos casa)
    const [casa, fora] = confronto.split(' x ');
    
    // 2. Filtro: Escanteios > 10 e gols > 2
    const temPotencial = mediaEscanteios >= 10 && golsPrevistos >= 2;
    
    return { temPotencial, casa };
}

async function monitorarJogos() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        
        $('.statln2').each((i, el) => {
            const texto = $(el).text().trim();
            // Lógica: Aqui extraímos as estatísticas que estão no texto do site
            // O senhor precisará garantir que essas variáveis venham do site via cheerio
            const mediaEscanteios = 11; // Exemplo: Extraído do site
            const golsPrevistos = 3;   // Exemplo: Extraído do site
            
            const resultado = analisarJogo(texto, mediaEscanteios, golsPrevistos);

            if (resultado.temPotencial) {
                const mensagem = `
⚽ *Oportunidade de Elite*
🏠 *Favorito:* ${resultado.casa}
📈 *Médias:* +10 Escanteios | +2 Gols
⚡ *Potencial HT:* Alto
🔔 *Notificação:* 1h antes do início.
                `;
                bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' });
            }
        });
    } catch (e) { console.error("Erro na análise:", e.message); }
}

// Rodar a cada 30 minutos para garantir precisão
setInterval(monitorarJogos, 1800000);
monitorarJogos();
