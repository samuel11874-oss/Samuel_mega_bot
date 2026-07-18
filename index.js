const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Filtro Somente Hoje'));
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
            timeout: 20000
        });

        const $ = cheerio.load(response.data);
        let capturandoHoje = false; // Trava de segurança

        $('div, tr, li, td, span').each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');
            const lowerLinha = linha.toLowerCase();

            // LÓGICA DE DATA:
            // Se encontrar "hoje", libera a captura. Se encontrar dia da semana, bloqueia.
            if (lowerLinha.includes('hoje')) {
                capturandoHoje = true;
            } else if (lowerLinha.includes('segunda') || lowerLinha.includes('terça') || lowerLinha.includes('quarta') || 
                       lowerLinha.includes('quinta') || lowerLinha.includes('sexta') || lowerLinha.includes('sábado') || 
                       lowerLinha.includes('domingo')) {
                capturandoHoje = false;
            }

            // Só processa se a "capturandoHoje" estiver liberada E contiver um jogo
            if (capturandoHoje && linha.includes(' x ')) {
                const matchNumero = linha.match(/(\d{2}[.,]\d)/);
                
                if (matchNumero) {
                    const valor = parseFloat(matchNumero[0].replace(',', '.'));

                    // Filtro de Média (10.6 a 15.0)
                    if (valor > 10.5 && valor <= 15.0) {
                        
                        let confronto = linha.replace(/Hoje/gi, '').replace(/\d{2}\/\d{2}/g, '').trim();
                        const matchConfronto = confronto.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                        
                        if (matchConfronto && !jogosEnviados.has(matchConfronto[0])) {
                            const jogoFinal = matchConfronto[0].trim();
                            jogosEnviados.add(jogoFinal);

                            const mensagem = `⚽ *JOGO DO DIA (HOJE)*\n` +
                                             `⚔️ *Confronto:* ${jogoFinal}\n` +
                                             `📊 *Média FT:* ${valor.toFixed(1)}\n` +
                                             `━━━━━━━━━━━━━━`;

                            bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                            console.log(`✅ ENVIADO HOJE: ${jogoFinal} | Média: ${valor}`);
                        }
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Limpa cache diariamente
setInterval(() => { jogosEnviados.clear(); }, 86400000); 
setInterval(monitorarJogos, 300000); 

monitorarJogos();
