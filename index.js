const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Captura Pura'));
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
        console.log("Iniciando varredura total...");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 30000
        });

        const $ = cheerio.load(response.data);
        
        // Vamos capturar TUDO que for linha de tabela (tr)
        $('tr').each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');
            
            // FILTRO ÚNICO: Só precisa ter " x ".
            // SEM FILTRO DE DATA, SEM FILTRO DE NÚMERO.
            if (linha.includes(' x ')) {
                
                // Vamos logar o que estamos encontrando para debugarmos se necessário
                console.log(`Lendo linha: ${linha.substring(0, 50)}...`);

                const confronto = linha.trim();

                if (!jogosEnviados.has(confronto)) {
                    jogosEnviados.add(confronto);
                    
                    const mensagem = `⚽ ${confronto}`;
                    bot.sendMessage(CHAT_ID, mensagem).catch(console.error);
                    console.log(`✅ ENVIADO: ${confronto}`);
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Limpa cache a cada 24h
setInterval(() => { jogosEnviados.clear(); }, 86400000); 

// Roda a cada 5 minutos
setInterval(monitorarJogos, 300000); 

// Primeira execução imediata
monitorarJogos();
