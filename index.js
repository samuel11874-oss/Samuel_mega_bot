const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Somente Hoje (17 de julho)'));
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
        console.log("Iniciando varredura filtrada (Apenas 17 de julho)...");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 30000
        });

        const $ = cheerio.load(response.data);
        
        // Esta variável controla se o bot está liberado para enviar ou não
        let lendoJogosDeHoje = false; 

        // Varremos todos os elementos (tr, h2, div) que podem conter datas ou jogos
        $('tr, h2, h3, div').each((i, el) => {
            const texto = $(el).text().trim().replace(/\s+/g, ' ');
            const textoLower = texto.toLowerCase();

            // 1. Detectar o cabeçalho de hoje (17 de julho)
            // Se encontrar "17" e "julho" na mesma linha, ligamos a chave
            if (textoLower.includes('jul') && textoLower.includes('17')) {
                lendoJogosDeHoje = true;
                return; // Pula essa linha, ela é apenas o título da data
            }

            // 2. Detectar se é uma data futura (amanhã ou depois)
            // Se encontrar "julho" mas não for "17", desligamos a chave
            if (textoLower.includes('jul') && !textoLower.includes('17')) {
                lendoJogosDeHoje = false;
            }

            // 3. Se a chave estiver ligada (é hoje) e for um jogo (tem " x ")
            if (lendoJogosDeHoje && texto.includes(' x ') && texto.length > 10 && texto.length < 150) {
                const confronto = texto.trim();

                if (!jogosEnviados.has(confronto)) {
                    jogosEnviados.add(confronto);
                    
                    // Dispara para o Telegram
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
