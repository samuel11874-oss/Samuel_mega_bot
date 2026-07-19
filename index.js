const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Caça Ampla'));
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
        
        // DEBUG: Se o bot não achar nada, este log vai te mostrar o que ele está lendo
        const textoCompleto = $('body').text();
        console.log("DEBUG - Início do site:", textoCompleto.substring(0, 300));

        let encontrados = 0;

        // Procura em toda a página por "Time x Time"
        // Regex bem solta para pegar qualquer coisa entre um "x"
        // Formato: QualquerTexto + espaço + x + espaço + QualquerTexto
        const regexJogo = /(.{3,30})\s+x\s+(.{3,30})/i;

        // Varre todos os elementos de texto
        $('div, p, td, span').each((i, el) => {
            const texto = $(el).text().trim();
            if (texto.includes(' x ')) {
                const match = texto.match(regexJogo);
                
                if (match) {
                    const timeA = match[1].trim();
                    const timeB = match[2].trim();
                    
                    // Procura números na mesma linha
                    const numeros = texto.match(/(\d{1,2}[.,]\d)/g);
                    
                    if (numeros && numeros.length >= 2) {
                        const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                        const chave = (timeA + timeB).toLowerCase().replace(/[^a-z]/g, '');
                        
                        if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(chave)) {
                            jogosEnviados.add(chave);
                            encontrados++;
                            
                            const msg = `⚽ *Oportunidade*\n` +
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

// Reset cache a cada 6h, checa a cada 5 min
setInterval(() => { jogosEnviados.clear(); }, 21600000);
setInterval(monitorarJogos, 300000); 
monitorarJogos();
