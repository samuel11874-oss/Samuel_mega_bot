const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Hoje (16/07)'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

let jogosEnviados = new Set();
// Definido conforme solicitado para hoje
const dataHoje = "16 de julho";

async function monitorarJogos() {
    try {
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 20000
        });

        const $ = cheerio.load(response.data);
        const elementos = $('div, tr, li, td');

        elementos.each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Filtro: Se a linha contém data, mas não é "16 de julho", ignora.
            // Isso garante que jogos de outros dias não entrem.
            if (linha.includes("de julho") && !linha.includes(dataHoje)) {
                return;
            }

            // Busca apenas linhas que tenham o padrão de confronto " x "
            if (linha.includes(' x ')) {
                // Procura por números decimais (ex: 11.5)
                const numeros = linha.match(/\d{1,2}\.\d{1,2}/g) || linha.match(/\d{1,2}\.\d/g);
                
                if (numeros && numeros.length >= 1) {
                    // Pega o último número encontrado (que geralmente é a média)
                    const mediaTotal = parseFloat(numeros[numeros.length - 1]);

                    if (mediaTotal > 10.5) {
                        const regexConfronto = /([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/;
                        const matchConfronto = linha.match(regexConfronto);
                        const confronto = matchConfronto ? matchConfronto[0].trim() : null;

                        if (confronto && !jogosEnviados.has(confronto)) {
                            jogosEnviados.add(confronto);
                            
                            const mensagem = `🔥 *Oportunidade - 16/07*\n` +
                                             `⚽ *Confronto:* ${confronto}\n` +
                                             `📊 *Média:* ${mediaTotal}`;

                            bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                            console.log(`✅ Enviado: ${confronto} | Média: ${mediaTotal}`);
                        }
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Roda a cada 5 minutos para garantir que nada passe batido
setInterval(monitorarJogos, 300000); 
monitorarJogos();
