const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot de Escanteios com Horário'));
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
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        const $ = cheerio.load(response.data);

        // Varre todos os elementos de texto
        $('div, tr, li').each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Filtro: Precisa ter um confronto " x " e média numérica
            if (linha.includes(' x ')) {
                const numeros = linha.match(/\d{1,2}\.\d/g);
                
                if (numeros && numeros.length >= 2) {
                    const mediaTotal = parseFloat(numeros[numeros.length - 1]);
                    
                    // Critério de 10.5
                    if (mediaTotal > 10.5) {
                        
                        // Captura do horário (procura formato 15:00, 20:00, etc)
                        const matchHora = linha.match(/\d{2}:\d{2}/);
                        const horario = matchHora ? matchHora[0] : "Horário não listado";
                        
                        // Limpeza do confronto
                        const regexConfronto = /([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/;
                        const matchConfronto = linha.match(regexConfronto);
                        const confronto = matchConfronto ? matchConfronto[0].trim() : "Confronto";

                        if (!jogosEnviados.has(confronto)) {
                            jogosEnviados.add(confronto);
                            
                            const mensagem = `🔥 *Oportunidade de Hoje*\n` +
                                             `⚽ *Confronto:* ${confronto}\n` +
                                             `⏰ *Horário:* ${horario}\n` +
                                             `📊 *Média Total:* ${mediaTotal}`;

                            bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                            console.log(`[ALERTA ENVIADO] ${confronto} às ${horario} -> ${mediaTotal}`);
                        }
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Roda a cada 10 minutos
setInterval(monitorarJogos, 600000); 
monitorarJogos();
