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
        console.log("Iniciando varredura filtrada (Apenas 17 de julho)...");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 30000
        });

        const $ = cheerio.load(response.data);
        
        let lendoJogosDeHoje = false; // Chave de segurança

        // Varremos todas as linhas da tabela
        $('tr').each((i, el) => {
            const linhaTexto = $(el).text().trim().replace(/\s+/g, ' ');
            const textoLower = linhaTexto.toLowerCase();

            // 1. Detectar se é o cabeçalho de hoje
            // Se a linha contiver "17" e "jul", ligamos a captura
            if (textoLower.includes('jul') && textoLower.includes('17')) {
                lendoJogosDeHoje = true;
                return; // Pula a linha do cabeçalho
            }
            
            // 2. Detectar se é um cabeçalho de outra data (amanhã ou depois)
            // Se encontrar "jul" e não for 17, desligamos a captura
            if (textoLower.includes('jul') && !textoLower.includes('17')) {
                lendoJogosDeHoje = false;
                return;
            }

            // 3. Se a chave estiver ligada (é hoje) e for um jogo (tem " x ")
            if (lendoJogosDeHoje && linhaTexto.includes(' x ')) {
                const confronto = linhaTexto.trim();

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

// Primeira execução
monitorarJogos();
