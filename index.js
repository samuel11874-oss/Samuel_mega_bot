const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot de Escanteios - Extração Real Ativa'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

let jogosEnviados = new Set();
const dataHoje = new Date().toLocaleDateString('pt-BR');

async function monitorarJogos() {
    try {
        console.log("--- Iniciando Varredura com Filtro Real ---");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        
        $('div').each((i, el) => {
            const texto = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Filtro: Precisa ter " x " e não ser cabeçalho
            if (texto.includes(' x ') && !texto.includes('ESTATÍSTICAS')) {
                
                // Extração: Busca APENAS números decimais (ex: 10.5)
                const matchMedia = texto.match(/(\d{1,2}\.\d{1,2})/);
                
                if (matchMedia) {
                    const media = parseFloat(matchMedia[0]);
                    
                    // Critério: Média real (entre 10.1 e 15.0)
                    if (media > 10.0 && media <= 15.0) {
                        
                        // Extração do nome dos times (simplificado)
                        const matchConfronto = texto.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                        
                        if (matchConfronto) {
                            const confronto = matchConfronto[0].trim();
                            
                            if (!jogosEnviados.has(confronto)) {
                                jogosEnviados.add(confronto);
                                
                                const msg = `⚽ *JOGO DO DIA* (${dataHoje})\n\n` +
                                            `⚔️ *Confronto:* ${confronto}\n` +
                                            `📊 *Média Real:* ${media}\n\n` +
                                            `🚀 _Samuel Mega Bot_`;
                                            
                                bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(console.error);
                                console.log(`✅ Jogo enviado: ${confronto} | Média Real: ${media}`);
                            }
                        }
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
