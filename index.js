const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot de Auditoria Ativo'));
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
        console.log("--- Varredura de Auditoria Iniciada ---");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        let encontrados = 0;

        $('div').each((i, el) => {
            const texto = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Auditoria: verifica se tem ' x ' no texto
            if (texto.includes(' x ') && !texto.includes('ESTATÍSTICAS DE ESCANTEIOS') && texto.length < 150) {
                encontrados++;
                const numeros = texto.match(/\d{1,2}\.\d/g);
                const media = numeros ? parseFloat(numeros[numeros.length - 1]) : 0;
                
                // Loga tudo para sabermos o que o bot está vendo
                console.log(`👁️ Visto: ${texto.substring(0, 50)}... | Média: ${media}`);

                if (media > 10.5 && media < 16.0) {
                    const matchConfronto = texto.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                    if (matchConfronto) {
                        const confronto = matchConfronto[0].trim();
                        if (!jogosEnviados.has(confronto)) {
                            jogosEnviados.add(confronto);
                            const msg = `🔥 *Oportunidade:* ${confronto}\n📊 *Média:* ${media}`;
                            bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(console.error);
                            console.log(`✅ Jogo enviado ao Telegram: ${confronto}`);
                        }
                    }
                }
            }
        });
        
        if (encontrados === 0) console.log("⚠️ Nenhum jogo identificado nesta varredura.");
        console.log("--- Varredura Finalizada ---");
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(monitorarJogos, 600000); 
monitorarJogos();
