const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Varredura Ampla'));
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
        
        // Varredura ampla em todos os containers possíveis
        $('div, tr, li, td, span').each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');

            // Procura apenas linhas que tenham um confronto (x)
            if (linha.includes(' x ')) {
                
                // Regex para capturar números decimais (ex: 10.6, 11.2)
                const matchNumero = linha.match(/(\d{2}[.,]\d)/);
                
                if (matchNumero) {
                    const valor = parseFloat(matchNumero[0].replace(',', '.'));

                    // Filtro: 10.6 a 15.0
                    if (valor > 10.5 && valor <= 15.0) {
                        
                        // Limpeza: remove "Hoje" e datas se aparecerem no texto
                        let confronto = linha.replace(/Hoje/gi, '').replace(/\d{2}\/\d{2}/g, '').trim();
                        // Pega apenas a parte do confronto
                        const matchConfronto = confronto.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                        
                        if (matchConfronto && !jogosEnviados.has(matchConfronto[0])) {
                            const jogoFinal = matchConfronto[0].trim();
                            jogosEnviados.add(jogoFinal);

                            const mensagem = `⚽ *OPORTUNIDADE REAL*\n` +
                                             `⚔️ *Confronto:* ${jogoFinal}\n` +
                                             `📊 *Média FT:* ${valor.toFixed(1)}\n` +
                                             `━━━━━━━━━━━━━━`;

                            bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                            console.log(`✅ ENVIADO: ${jogoFinal} | Média: ${valor}`);
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
setInterval(monitorarJogos, 300000); 

monitorarJogos();
