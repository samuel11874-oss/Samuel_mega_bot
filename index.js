const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Filtro de Hoje Ativo'));
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
        let estaEmHoje = true; // Começamos no modo "Hoje"

        $('div').each((i, el) => {
            const $el = $(el);
            const texto = $el.text().trim();

            // Interruptor: Se encontrar o cabeçalho de amanhã, desliga a captura
            if (/amanhã|tomorrow/i.test(texto) && texto.length < 20) {
                estaEmHoje = false;
            }

            // Ignora menus e só processa se estiver no modo "Hoje"
            if (estaEmHoje && !$el.hasClass('menu-item-content') && !$el.closest('.menu').length) {
                
                if (texto.includes(' x ') && /\d[.,]\d/.test(texto)) {
                    const match = texto.match(/([A-Za-zÀ-ÿ\s]{3,})\s?x\s?([A-Za-zÀ-ÿ\s]{3,})/i);
                    const numeros = texto.match(/(\d{1,2}[.,]\d)/g);
                    
                    if (match && numeros && numeros.length >= 2) {
                        const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                        
                        if (media > 9.5 && media <= 15.0) {
                            const chave = (match[1] + match[2]).toLowerCase().replace(/\s/g, '');
                            
                            if (!jogosEnviados.has(chave)) {
                                jogosEnviados.add(chave);
                                encontrados++;
                                
                                const msg = `⚽ *Oportunidade de Hoje*\n` +
                                            `⚔️ *${match[1].trim()} x ${match[2].trim()}*\n` +
                                            `📊 *Média: ${media.toFixed(1)}*`;
                                
                                bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                                console.log(`✅ ENVIADO (Hoje): ${match[1].trim()} x ${match[2].trim()} | Média: ${media.toFixed(1)}`);
                            }
                        }
                    }
                }
            }
        });
        
        console.log(`🔍 Varredura concluída. Jogos processados hoje: ${encontrados}`);
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(() => { jogosEnviados.clear(); }, 3600000);
setInterval(monitorarJogos, 300000); 
monitorarJogos();
