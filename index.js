const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Todos os Jogos de Hoje'));
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
        console.log("Iniciando varredura geral (Todos os jogos de hoje)...");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 20000
        });

        const $ = cheerio.load(response.data);
        
        // Usando o seletor 'tr' para pegar cada linha de jogo separadamente
        $('tr').each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');

            // Filtra apenas o que tem " x " e a palavra "Hoje"
            if (linha.includes(' x ') && linha.includes('Hoje')) {
                
                const regexConfronto = /([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/;
                const matchConfronto = linha.match(regexConfronto);
                let confronto = matchConfronto ? matchConfronto[0].trim() : null;

                if (confronto) {
                    // Limpa o nome do confronto removendo a palavra "Hoje"
                    confronto = confronto.replace(/^Hoje\s*/i, '').trim();

                    if (!jogosEnviados.has(confronto)) {
                        jogosEnviados.add(confronto);

                        const mensagem = `⚽ *Jogo de Hoje*\n` +
                                         `*Confronto:* ${confronto}`;

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

// Primeira execução
monitorarJogos();
