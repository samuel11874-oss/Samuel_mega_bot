const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot de Escanteios Limpo Ativo'));
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
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        const $ = cheerio.load(response.data);

        $('div, tr, li').each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Foca apenas onde tem confronto real
            if (linha.includes(' x ')) {
                
                // Extração dos dados
                const numeros = linha.match(/\d{1,2}\.\d/g);
                if (numeros && numeros.length >= 3) {
                    const mediaTotal = parseFloat(numeros[numeros.length - 1]);
                    
                    if (mediaTotal > 10.5) {
                        // Limpeza do nome da Liga e Confronto
                        const partes = linha.split('ESTATÍSTICAS DE ESCANTEIOS');
                        const liga = partes[0].trim();
                        
                        // Captura o padrão "Time X Time" (limpando o resto do texto sujo)
                        const regexConfronto = /([A-Za-zÀ-ÿ0-9\s]+)\sx\s([A-Za-zÀ-ÿ0-9\s]+)/;
                        const matchConfronto = linha.match(regexConfronto);
                        const confronto = matchConfronto ? matchConfronto[0].trim() : "Confronto não listado";

                        // Formatação final da mensagem
                        const mensagem = `
🔥 *Oportunidade de Cantos*
🏆 *Liga:* ${liga}
⚽ *Confronto:* ${confronto}
📊 *Média Total:* ${mediaTotal}
`;

                        bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na varredura:", e.message);
    }
}

// Roda a cada 15 minutos
setInterval(monitorarJogos, 900000); 
monitorarJogos();
