const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Captura Global'));
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
        console.log("Iniciando varredura global de todas as ligas...");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 30000
        });

        const $ = cheerio.load(response.data);
        
        // Focamos especificamente em linhas de tabela (tr), que é onde o site lista os jogos
        $('tr').each((i, el) => {
            const linhaTexto = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Critério: Contém " x "? É um jogo. Sem filtro de data ou liga.
            if (linhaTexto.includes(' x ') && linhaTexto.length > 10 && linhaTexto.length < 200) {
                
                const confronto = linhaTexto.trim();

                // Evita enviar o mesmo jogo várias vezes na mesma execução
                if (!jogosEnviados.has(confronto)) {
                    jogosEnviados.add(confronto);
                    
                    bot.sendMessage(CHAT_ID, `⚽ ${confronto}`).catch(console.error);
                    console.log(`✅ Enviado (Global): ${confronto}`);
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reseta o cache de jogos a cada 24 horas para não sobrecarregar
setInterval(() => { jogosEnviados.clear(); }, 86400000); 

// Varredura a cada 10 minutos
setInterval(monitorarJogos, 600000); 

// Primeira execução ao ligar
monitorarJogos();
