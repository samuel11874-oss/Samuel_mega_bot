const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot de Escanteios - Versão Liga/Data Corrigida'));
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
        console.log("--- Iniciando Varredura Diária ---");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        
        // Vamos percorrer os elementos que contêm os jogos
        $('div').each((i, el) => {
            const texto = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Filtro rigoroso: Tem que ter "Hoje", tem que ter " x "
            if (texto.includes('Hoje') && texto.includes(' x ')) {
                
                // Extração da Média (busca um número de 2 dígitos)
                const matchNumeros = texto.match(/(\d{2})/);
                if (matchNumeros) {
                    const media = parseInt(matchNumeros[0]);
                    
                    if (media > 10 && media < 30) {
                        // Limpeza: Extrai a liga e os times
                        // Padrão esperado no texto: "Hoje [Liga] [Time A] x [Time B]"
                        const partes = texto.split('Hoje')[1];
                        
                        // Regex para separar Liga e Confronto
                        // Exemplo: "Campeonato Brasileiro Palmeiras x Flamengo"
                        const matchConfronto = partes.match(/(.+?)\s([A-Za-zÀ-ÿ\s]+)\sx\s([A-Za-zÀ-ÿ\s]+)/);
                        
                        if (matchConfronto) {
                            const liga = matchConfronto[1].trim();
                            const timeA = matchConfronto[2].trim();
                            const timeB = matchConfronto[3].trim();
                            const confronto = `${timeA} x ${timeB}`;
                            
                            if (!jogosEnviados.has(confronto)) {
                                jogosEnviados.add(confronto);
                                
                                const msg = `⚽ *JOGO DO DIA* (16/07/2026)\n\n` +
                                            `🏆 *Liga:* ${liga}\n` +
                                            `⚔️ *Confronto:* ${confronto}\n` +
                                            `📊 *Média de Escanteios:* ${media}\n\n` +
                                            `🚀 _Samuel Mega Bot_`;
                                            
                                bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(console.error);
                                console.log(`✅ Enviado: ${liga} | ${confronto} | Média: ${media}`);
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

// O bot roda a cada 10 minutos para garantir que, se um jogo aparecer no site, ele pegue
setInterval(monitorarJogos, 600000); 
monitorarJogos();
