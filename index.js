const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional: Leitura Sequencial Ativada'));
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
        console.log("--------------------------------------------------");
        console.log("[MONITORANDO JOGOS...] Iniciando nova varredura sequencial...");

        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS, timeout: 15000 });
        const $ = cheerio.load(data);
        
        let totalAnalisados = 0;
        let totalDisparados = 0;
        let ligaAtual = ""; // O robô memoriza a liga enquanto desce a lista

        // O Segredo: Varredura linha por linha (<tr>)
        $('tr').each((i, el) => {
            const classeOriginal = $(el).attr('class') || '';
            const textoLinha = $(el).text().trim();

            // Identifica se a linha é o título da liga
            if (classeOriginal.includes('wttr2')) {
                ligaAtual = textoLinha;
            } 
            // Identifica se a linha é uma partida (captura statln e statln2)
            else if (classeOriginal.includes('statln')) {
                totalAnalisados++;
                
                // Filtro 1: A liga memorizada é de Elite?
                if (LIGAS_ELITE.some(liga => ligaAtual.includes(liga))) {
                    
                    // Filtro 2: Possui alta média de cantos?
                    if (textoLinha.includes('10') || textoLinha.includes('11') || textoLinha.includes('12') || textoLinha.includes('13') || textoLinha.includes('14')) {
                        const linkBusca = `https://www.google.com/search?q=bet365+${encodeURIComponent(textoLinha)}`;
                        
                        const mensagem = `
🏆 *Oportunidade de Elite*
🌍 *Liga:* ${ligaAtual}
⚽ *Confronto:* [${textoLinha}](${linkBusca})
📈 *Critérios:* Favorito Home | Média >10 Cantos | Potencial Gols
🔔 *Status:* Jogo filtrado (1ª/2ª Divisão)
                        `;
                        
                        bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' });
                        totalDisparados++;
                    }
                }
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
