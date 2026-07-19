const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Filtro de Hoje'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

let jogosEnviados = new Set();

async function monitorarJogos() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let encontrados = 0;
        let pararLeitura = false;

        // Regex: 
        // 1. Ignora "Hoje" ou "Today" no início (não captura)
        // 2. Captura Time A
        // 3. Captura Time B
        const regexJogo = /(?:Hoje|Today)?\s*([A-ZÀ-ÿ][A-Za-zÀ-ÿ\s]{2,})\s?x\s?([A-ZÀ-ÿ][A-Za-zÀ-ÿ\s]{2,})/i;

        $('tr').each((i, el) => {
            if (pararLeitura) return false;

            const texto = $(el).text();
            
            // Regra de Parada: se encontrar "Amanhã", encerra a busca
            if (/amanhã|tomorrow/i.test(texto)) {
                pararLeitura = true;
                return false;
            }

            if (texto.includes(' x ')) {
                const match = texto.match(regexJogo);
                
                if (match) {
                    const timeA = match[1].trim();
                    const timeB = match[2].trim();
                    
                    const numeros = texto.match(/(\d{1,2}[.,]\d)/g);
                    if (numeros && numeros.length >= 2) {
                        const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                        const chave = (timeA + timeB).toLowerCase().replace(/[^a-z]/g, '');
                        
                        if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(chave)) {
                            jogosEnviados.add(chave);
                            encontrados++;
                            
                            const msg = `⚽ *Oportunidade de Hoje*\n` +
                                        `⚔️ *${timeA} x ${timeB}*\n` +
                                        `📊 *Média: ${media.toFixed(1)}*`;
                            
                            bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                            console.log(`✅ ENVIADO: ${timeA} x ${timeB} | Média: ${media.toFixed(1)}`);
                        }
                    }
                }
            }
        });
        console.log(`🔍 Varredura concluída. Novos jogos hoje: ${encontrados}`);
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(() => { jogosEnviados.clear(); }, 7200000);
setInterval(monitorarJogos, 300000); 
monitorarJogos();
