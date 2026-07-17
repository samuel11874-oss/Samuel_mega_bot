const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Bloco Isolado'));
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
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 20000
        });

        const $ = cheerio.load(response.data);
        
        // Estratégia: Encontrar o elemento que contém o texto "Hoje"
        // E capturar apenas os elementos (tr) seguintes até o próximo cabeçalho de data
        let hojeEncontrado = false;

        // Limpa o log a cada verificação para evitar poluição
        console.log("Iniciando varredura apenas no bloco de Hoje...");

        // Percorre elementos de topo (h2/h3) e tabelas
        $('h1, h2, h3, tr').each((i, el) => {
            const texto = $(el).text().trim().toLowerCase();

            // Identifica o cabeçalho "Hoje"
            if (texto.includes('hoje')) {
                hojeEncontrado = true;
                return;
            }

            // Se encontrarmos qualquer outro cabeçalho de data, paramos a captura
            if (hojeEncontrado && ($(el).is('h2') || $(el).is('h3') || texto.includes('amanhã') || /\d{2}\/\d{2}/.test(texto))) {
                hojeEncontrado = false;
                return;
            }

            // Se estivermos dentro do bloco de "Hoje", processamos apenas as linhas de jogo (tr)
            if (hojeEncontrado && $(el).is('tr') && texto.includes(' x ')) {
                const match = $(el).text().trim().match(/([a-zà-ÿ\s]{3,})\sx\s([a-zà-ÿ\s]{3,})/i);
                
                if (match) {
                    const confronto = match[0].trim();

                    if (!jogosEnviados.has(confronto)) {
                        jogosEnviados.add(confronto);
                        
                        const mensagem = `⚽ *JOGO DE HOJE*\n` +
                                         `━━━━━━━━━━━━━━\n` +
                                         `*Partida:* ${confronto}\n` +
                                         `━━━━━━━━━━━━━━`;

                        bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                        console.log(`✅ Enviado: ${confronto}`);
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Limpa cache diariamente
setInterval(() => { jogosEnviados.clear(); }, 86400000); 
// Varredura a cada 5 minutos
setInterval(monitorarJogos, 300000); 

monitorarJogos();
