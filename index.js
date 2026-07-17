const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Captura Total (Sem Filtros)'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

// Cache para não enviar o mesmo jogo várias vezes
let jogosEnviados = new Set();

async function monitorarJogos() {
    try {
        console.log("Iniciando varredura no site...");
        
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 30000
        });

        const $ = cheerio.load(response.data);
        
        // Vamos procurar apenas linhas de tabela (tr) que contenham " x "
        $('tr').each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');
            
            // FILTRO ÚNICO: Identificar o confronto
            // Qualquer linha que contenha " x " é considerada um jogo válido
            if (linha.includes(' x ')) {
                
                // Regex simples para capturar os nomes dos times antes e depois do "x"
                const regexConfronto = /([A-Za-zÀ-ÿ0-9\s.-]+)\sx\s([A-Za-zÀ-ÿ0-9\s.-]+)/;
                const match = linha.match(regexConfronto);
                
                if (match) {
                    const confronto = match[0].trim();
                    
                    if (!jogosEnviados.has(confronto)) {
                        jogosEnviados.add(confronto);
                        
                        // Envio para o Telegram
                        bot.sendMessage(CHAT_ID, `⚽ Jogo encontrado:\n${confronto}`).catch(console.error);
                        console.log(`✅ Enviado: ${confronto}`);
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Limpa a memória de jogos enviados a cada 24 horas para recomeçar o monitoramento
setInterval(() => { 
    jogosEnviados.clear(); 
    console.log("Cache limpo.");
}, 86400000); 

// Varredura a cada 5 minutos
setInterval(monitorarJogos, 300000); 

// Primeira execução ao ligar
monitorarJogos();
