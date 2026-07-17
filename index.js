const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Filtro 11.0 FT'));
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
        console.log("Varrendo lista para jogos com Média > 11.0...");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 30000
        });

        const $ = cheerio.load(response.data);
        
        $('tr').each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Procura por números no formato XX.X ou XX,X
            const textoLimpo = linha.replace(',', '.');
            const numeros = textoLimpo.match(/(\d{2}\.\d)/g);
            
            if (numeros && numeros.length >= 2 && linha.includes(' x ')) {
                const medias = numeros.map(n => parseFloat(n));
                const soma = medias[0] + medias[1];

                // CRITÉRIO: Maior que 11.0
                if (soma > 11.0) {
                    const regexConfronto = /([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/;
                    const matchConfronto = linha.match(regexConfronto);
                    const confronto = matchConfronto ? matchConfronto[0].trim() : null;

                    if (confronto && !jogosEnviados.has(confronto)) {
                        jogosEnviados.add(confronto);
                        
                        bot.sendMessage(CHAT_ID, `⚽ ${confronto}\n📊 *Soma:* ${soma.toFixed(1)}`, { parse_mode: 'Markdown' });
                        console.log(`✅ Enviado: ${confronto} | Soma: ${soma.toFixed(1)}`);
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reseta o cache de jogos a cada 24 horas
setInterval(() => { jogosEnviados.clear(); }, 86400000); 

// Varredura a cada 5 minutos
setInterval(monitorarJogos, 300000); 

monitorarJogos();
