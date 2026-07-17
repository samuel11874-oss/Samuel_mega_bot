const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Com Filtro de Segurança'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

let jogosEnviados = new Set();
const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function getDataHoje() {
    const agora = new Date();
    return `${agora.getDate()} de ${meses[agora.getMonth()]}`;
}

async function monitorarJogos() {
    try {
        const dataHoje = getDataHoje();
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const elementos = $('div, tr, li, td');

        elementos.each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');
            
            if (linha.includes("de julho") && !linha.includes(dataHoje)) {
                return;
            }

            if (linha.includes(' x ')) {
                // Captura números com decimais (ex: 10.5, 11.2)
                const numeros = linha.match(/\d{2}\.\d/g);
                
                if (numeros) {
                    // FILTRO DE SEGURANÇA: Só aceita média entre 9.0 e 15.5
                    let mediaValida = 0;
                    for(let num of numeros) {
                        let valor = parseFloat(num);
                        if (valor > 9.0 && valor <= 15.5) {
                            mediaValida = valor;
                            break;
                        }
                    }

                    if (mediaValida > 10.5) {
                        const regexConfronto = /([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/;
                        const matchConfronto = linha.match(regexConfronto);
                        const confronto = matchConfronto ? matchConfronto[0].trim() : null;

                        if (confronto && !jogosEnviados.has(confronto)) {
                            jogosEnviados.add(confronto);
                            
                            const mensagem = `🔥 *Oportunidade - ${dataHoje}*\n` +
                                             `⚽ *Confronto:* ${confronto}\n` +
                                             `📊 *Média de Escanteios:* ${mediaValida}`;

                            bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                            console.log(`✅ Enviado: ${confronto} | Média: ${mediaValida}`);
                        }
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(() => { jogosEnviados.clear(); }, 86400000); 
setInterval(monitorarJogos, 600000); 
monitorarJogos();
