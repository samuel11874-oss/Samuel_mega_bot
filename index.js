const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional: Modo Diagnóstico Ativado'));
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
        console.log("[MONITORANDO JOGOS...] Iniciando Modo Diagnóstico Raio-X...");

        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS, timeout: 15000 });
        const $ = cheerio.load(data);
        
        // --- INÍCIO DO RAIO-X ---
        console.log("=== RESULTADO DO RAIO-X ===");
        console.log("Título da página recebida: " + $('title').text());
        console.log("Tamanho do código HTML: " + data.length + " caracteres");
        console.log("Quantidade de linhas (<tr>) achadas: " + $('tr').length);
        console.log("===========================");
        // --- FIM DO RAIO-X ---

        let totalAnalisados = 0;
        let ligaAtual = "";

        $('tr').each((i, el) => {
            const classeOriginal = $(el).attr('class') || '';
            const textoLinha = $(el).text().trim();

            if (classeOriginal.includes('wttr2')) {
                ligaAtual = textoLinha;
            } else if (classeOriginal.includes('statln')) {
                totalAnalisados++;
            }
        });

        console.log(`>> Total de jogos lidos na estrutura antiga: ${totalAnalisados}`);
        console.log("--------------------------------------------------");

    } catch (e) {
        console.error("Erro na análise profunda:", e.message);
    }
}

// Roda a cada 60 minutos
setInterval(monitorarJogos, 3600000);
monitorarJogos();
