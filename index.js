const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Captura Total'));
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
        console.log("Iniciando varredura na página...");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 20000
        });

        const $ = cheerio.load(response.data);
        
        // Pega todas as linhas da tabela
        const elementos = $('tr'); 

        elementos.each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Só processa se contiver o " x " indicando confronto
            if (linha.includes(' x ')) {
                // Remove espaços extras para padronizar
                const confronto = linha.replace(/\s+/g, ' ').trim();
                
                // Exibe no log do Render o que ele encontrou (para você debugar)
                console.log(`Linha encontrada: ${confronto.substring(0, 50)}...`);

                if (!jogosEnviados.has(confronto)) {
                    jogosEnviados.add(confronto);
                    
                    const mensagem = `⚽ ${confronto}`;
                    bot.sendMessage(CHAT_ID, mensagem).catch(console.error);
                    console.log(`✅ Enviado para Telegram: ${confronto}`);
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reseta a lista de enviados a cada 24 horas
setInterval(() => { jogosEnviados.clear(); }, 86400000); 
// Busca a cada 5 minutos
setInterval(monitorarJogos, 300000); 
monitorarJogos();
