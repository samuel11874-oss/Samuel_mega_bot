const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Hoje Dinâmico'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

let jogosEnviados = new Set();

// Gerador automático de data (Ex: "16 de julho")
const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
function getDataHoje() {
    const agora = new Date();
    return `${agora.getDate()} de ${meses[agora.getMonth()]}`;
}

async function monitorarJogos() {
    try {
        const dataHoje = getDataHoje(); // Atualiza a data a cada ciclo
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const elementos = $('div, tr, li, td');

        elementos.each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Filtro: Se a linha contém mês, mas não é "hoje", descarta
            if (linha.includes("de julho") && !linha.includes(dataHoje)) {
                return;
            }

            if (linha.includes(' x ')) {
                const numeros = linha.match(/\d{1,2}\.\d/g);
                
                if (numeros && numeros.length >= 2) {
                    const mediaTotal = parseFloat(numeros[numeros.length - 1]);

                    if (mediaTotal > 10.5) {
                        const regexConfronto = /([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/;
                        const matchConfronto = linha.match(regexConfronto);
                        const confronto = matchConfronto ? matchConfronto[0].trim() : null;

                        if (confronto && !jogosEnviados.has(confronto)) {
                            jogosEnviados.add(confronto);
                            
                            const mensagem = `🔥 *Oportunidade - ${dataHoje}*\n` +
                                             `⚽ *Confronto:* ${confronto}\n` +
                                             `📊 *Média Total:* ${mediaTotal}`;

                            bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                        }
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Limpa os jogos enviados diariamente à meia-noite para começar o dia novo limpo
setInterval(() => { jogosEnviados.clear(); }, 86400000); 

setInterval(monitorarJogos, 600000); 
monitorarJogos();
