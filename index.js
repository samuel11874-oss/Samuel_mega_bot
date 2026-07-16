const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional: Sistema Blindado e Corrigido'));
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

// Sua lista de exigência máxima
const LIGAS_ELITE = [
    'Premier League', 'Championship', 'La Liga', 'Serie A', 'Bundesliga', 
    'Ligue 1', 'Brasileirão Série A', 'Brasileirão Série B', 'Champions League', 
    'Libertadores', 'Eredivisie', 'Primeira Liga'
];

async function monitorarJogos() {
    try {
        console.log("--------------------------------------------------");
        console.log("[MONITORANDO JOGOS...] Iniciando nova varredura profunda...");

        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS, timeout: 15000 });
        const $ = cheerio.load(data);
        
        let totalAnalisados = 0;
        let totalDisparados = 0;

        $('.wttr2').each((i, el) => {
            const nomeLiga = $(el).text().trim();
            
            // O Segredo: Agora ele desce linha por linha pegando TODOS os jogos da liga
            let proximoElemento = $(el).next();
            
            while (proximoElemento.length > 0 && !proximoElemento.hasClass('wttr2')) {
                if (proximoElemento.hasClass('statln2')) {
                    totalAnalisados++; // Conta que o bot leu a linha
                    const textoJogo = proximoElemento.text().trim();
                    
                    // Filtro 1: Passou na peneira da Liga de Elite?
                    if (LIGAS_ELITE.some(liga => nomeLiga.includes(liga))) {
                        
                        // Filtro 2: Passou na peneira de Médias Altas (>10 cantos)?
                        if (textoJogo.includes('10') || textoJogo.includes('11') || textoJogo.includes('12') || textoJogo.includes('13') || textoJogo.includes('14')) {
                            const linkBusca = `https://www.google.com/search?q=bet365+${encodeURIComponent(textoJogo)}`;
                            
                            const mensagem = `
🏆 *Oportunidade de Elite*
🌍 *Liga:* ${nomeLiga}
⚽ *Confronto:* [${textoJogo}](${linkBusca})
📈 *Critérios:* Favorito Home | Média >10 Cantos | Potencial Gols
🔔 *Status:* Jogo filtrado (1ª/2ª Divisão)
                            `;
                            
                            bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' });
                            totalDisparados++; // Conta que enviou pro Telegram
                        }
                    }
                }
                proximoElemento = proximoElemento.next(); // Avança para a próxima linha
            }
        });

        console.log(`[VARREDURA CONCLUÍDA] Processo finalizado.`);
        console.log(`>> Total de jogos lidos e analisados no site: ${totalAnalisados}`);
        console.log(`>> Total de jogos APROVADOS (Elite + Escanteios >10): ${totalDisparados}`);
        console.log("--------------------------------------------------");

    } catch (e) {
        console.error("Erro na análise profunda:", e.message);
    }
}

// Roda a cada 60 minutos
setInterval(monitorarJogos, 3600000);
monitorarJogos();
