const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot em Modo Detetive'));
app.listen(process.env.PORT || 3000);

console.log("Bot iniciado com sucesso!");

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

async function monitorarJogos() {
    console.log("Iniciando varredura...");

    try {
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        console.log("Página carregada. Analisando conteúdo...");
        const $ = cheerio.load(response.data);
        let encontrados = 0;

        // Voltamos para div, tr, li para garantir que pegamos tudo
        $('div, tr, li').each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Filtro mais abrangente
            if (linha.includes(' x ')) {
                const numeros = linha.match(/\d{1,2}\.\d/g);
                
                if (numeros && numeros.length >= 3) {
                    const mediaTotal = parseFloat(numeros[numeros.length - 1]);
                    
                    if (mediaTotal > 10.5) {
                        encontrados++;
                        console.log(`[ALERTA POTENCIAL] Encontrado: ${linha.substring(0, 50)}... | Média: ${mediaTotal}`);
                        
                        // Envio direto para testar
                        bot.sendMessage(CHAT_ID, `🔥 *Oportunidade:* ${linha.substring(0, 100)}\n📊 *Média:* ${mediaTotal}`).catch(err => console.log("Erro Telegram:", err.message));
                    }
                }
            }
        });

        console.log(`Varredura concluída. Total de jogos > 10.5 encontrados: ${encontrados}`);
        
    } catch (e) {
        console.error("ERRO CRÍTICO NA VARREDURA:", e.message);
    }
}

// Roda imediatamente e depois a cada 15 minutos
monitorarJogos();
setInterval(monitorarJogos, 900000); 
