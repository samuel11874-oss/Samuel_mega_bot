const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Diagnóstico'));
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
        console.log(`Buscando jogos para: ${dataHoje}`);
        
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 20000
        });

        const $ = cheerio.load(response.data);
        const elementos = $('tr'); // Focando em linhas de tabela que é onde os jogos ficam

        elementos.each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Log para debug: se você vir o jogo no log e ele não enviar, é o filtro
            if (linha.includes(' x ')) {
                // Regex aceita ponto OU vírgula
                const regexNumeros = /(\d{1,2}[.,]\d{1,2})/g;
                let numeros = linha.match(regexNumeros);
                
                if (numeros) {
                    // Converte vírgula para ponto e transforma em número
                    let medias = numeros.map(n => parseFloat(n.replace(',', '.')));
                    
                    // Filtra apenas valores que fazem sentido para escanteios (1.0 a 15.0)
                    let mediasPossiveis = medias.filter(n => n >= 1.0 && n <= 15.0);

                    if (mediasPossiveis.length >= 2) {
                        let soma = mediasPossiveis[0] + mediasPossiveis[1];
                        
                        if (soma > 10.5) {
                            const confronto = linha.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                            if (confronto && !jogosEnviados.has(confronto[0])) {
                                jogosEnviados.add(confronto[0]);
                                
                                const mensagem = `⚽ ${confronto[0].trim()}\n` +
                                                 `📊 Soma: ${soma.toFixed(1)} (${mediasPossiveis[0]} + ${mediasPossiveis[1]})`;
                                
                                bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                                console.log(`✅ Enviado: ${confronto[0]}`);
                            }
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
