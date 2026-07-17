const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Hoje (17 de julho)'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

let jogosEnviados = new Set();

async function monitorarJogos() {
    try {
        console.log("Iniciando varredura filtrada por data (17 de julho)...");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 30000
        });

        const $ = cheerio.load(response.data);
        
        // Esta variável controla se estamos lendo jogos de "hoje" ou não
        let lendoHoje = false;

        // Iteramos sobre todos os elementos que podem ser cabeçalhos ou linhas de jogo
        $('h1, h2, h3, h4, tr').each((i, el) => {
            const texto = $(el).text().trim();
            const textoLower = texto.toLowerCase();

            // 1. Verifica se encontramos um cabeçalho de data
            if (textoLower.includes('julho')) {
                if (textoLower.includes('17')) {
                    lendoHoje = true; // Achamos hoje, liga a captura
                    console.log("-> Seção de hoje (17 de julho) encontrada.");
                } else {
                    lendoHoje = false; // Achamos outra data, desliga a captura
                }
            }

            // 2. Se estivermos na seção de hoje e for uma linha de jogo (tr)
            if (lendoHoje && $(el).is('tr') && texto.includes(' x ')) {
                const confronto = texto.replace(/\s+/g, ' ');

                if (confronto.length > 10 && !jogosEnviados.has(confronto)) {
                    jogosEnviados.add(confronto);
                    
                    bot.sendMessage(CHAT_ID, `⚽ ${confronto}`).catch(console.error);
                    console.log(`✅ Enviado (Hoje): ${confronto}`);
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reseta o cache de jogos a cada 24 horas
setInterval(() => { jogosEnviados.clear(); }, 86400000); 

// Varredura a cada 10 minutos
setInterval(monitorarJogos, 600000); 

// Primeira execução ao ligar
monitorarJogos();
