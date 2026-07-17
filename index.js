const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot de Escanteios - Média > 11'));
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
        console.log("--- Iniciando Varredura (Filtro > 11) ---");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        
        $('div').each((i, el) => {
            const texto = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Verifica se tem confronto e não é cabeçalho
            if (texto.includes(' x ') && !texto.includes('ESTATÍSTICAS') && texto.length < 150) {
                
                // Tenta capturar o número da média
                const matchNumeros = texto.match(/\d{2}/);
                
                if (matchNumeros) {
                    const media = parseInt(matchNumeros[0]);
                    
                    // AQUI ESTÁ A MUDANÇA: Filtro de média > 11
                    if (media > 11 && media < 20) {
                        const matchConfronto = texto.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                        
                        if (matchConfronto) {
                            const confronto = matchConfronto[0].trim();
                            
                            if (!jogosEnviados.has(confronto)) {
                                jogosEnviados.add(confronto);
                                const msg = `🔥 *Oportunidade:* ${confronto}\n📊 *Média Detectada:* ${media}`;
                                bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(console.error);
                                console.log(`✅ Jogo enviado: ${confronto} | Média: ${media}`);
                            }
                        }
                    } else {
                        // Log opcional para você ver que ele está filtrando (não envia ao Telegram)
                        // console.log(`👁️ Visto: ${texto.substring(0, 40)}... | Média: ${media} (Ignorado)`);
                    }
                }
            }
        });
        console.log("--- Varredura Finalizada ---");
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(monitorarJogos, 600000); 
monitorarJogos();
