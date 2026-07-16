const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ajustado - Varrendo Divs'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

async function monitorarJogos() {
    try {
        console.log("--- Iniciando Varredura (Modo Divs) ---");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        
        // Agora vamos varrer todos os 'divs' que costumam conter informações de jogos
        $('div').each((i, el) => {
            const texto = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Filtro para buscar linhas que tenham o padrão de jogo (Time A x Time B)
            if (texto.includes(' x ') && texto.length < 200) { 
                
                // Extração da média de escanteios
                const numeros = texto.match(/\d{1,2}\.\d/g);
                if (numeros) {
                    const media = parseFloat(numeros[numeros.length - 1]);
                    
                    if (media > 10.5) {
                        console.log(`[JOGO ENCONTRADO]: ${texto.substring(0, 60)} | Média: ${media}`);
                        
                        const msg = `🔥 Oportunidade: ${texto.split('x')[0].trim()} x ${texto.split('x')[1].split(/[0-9]/)[0].trim()}\n📊 Média: ${media}`;
                        bot.sendMessage(CHAT_ID, msg).catch(console.error);
                    }
                }
            }
        });
        console.log("--- Fim da Varredura ---");
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(monitorarJogos, 600000); 
monitorarJogos();
