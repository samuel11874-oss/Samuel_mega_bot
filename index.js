const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Captura Somente Hoje'));
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
        
        let lendoHoje = false; // Chave que controla se estamos na data correta

        // Varremos a tabela procurando por datas e depois por jogos
        $('tr').each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');
            const textoLower = linha.toLowerCase();

            // 1. Verifica se encontramos um cabeçalho de data
            // Se encontrar "17" e "julho", ligamos a captura
            if (textoLower.includes('julho')) {
                if (textoLower.includes('17')) {
                    lendoHoje = true; // Achamos hoje, liga a chave
                    console.log("-> Seção de hoje (17 de julho) ativada.");
                } else {
                    // Se encontrar outra data de julho (ex: 18 de julho), desliga a captura
                    lendoHoje = false; 
                }
            }

            // 2. Se estivermos na seção de hoje e for uma linha de jogo (contém ' x ')
            if (lendoHoje && linha.includes(' x ') && linha.length < 150) {
                const confronto = linha.trim();

                if (!jogosEnviados.has(confronto)) {
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
