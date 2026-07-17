const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Captura Apenas Hoje'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

let jogosEnviados = new Set();
// Data de hoje fixa para o filtro
const DATA_HOJE = "17 de julho"; 

async function monitorarJogos() {
    try {
        console.log("Iniciando varredura para jogos de hoje...");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 30000
        });

        const $ = cheerio.load(response.data);
        
        // Vamos procurar nas linhas da tabela (tr)
        $('tr').each((i, el) => {
            const linhaTexto = $(el).text().trim().replace(/\s+/g, ' ');

            // FILTRO DE DATA: Só processa se a linha contiver "17 de julho" OU
            // se o bot já estiver "dentro" da seção de hoje. 
            // Como sites mudam, vamos focar em verificar se a linha tem o confronto e a data
            const contemConfronto = linhaTexto.includes(' x ');
            const ehHoje = linhaTexto.toLowerCase().includes(DATA_HOJE.toLowerCase());

            // Se for um jogo e for de hoje
            if (contemConfronto && ehHoje) {
                
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

// Reseta o cache a cada 24 horas
setInterval(() => { jogosEnviados.clear(); }, 86400000); 

// Varredura a cada 10 minutos
setInterval(monitorarJogos, 600000); 

// Execução inicial
monitorarJogos();
