const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Filtro Média > 11'));
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
        console.log("--- Iniciando Varredura (Geral > 11) ---");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        
        $('div').each((i, el) => {
            const texto = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Filtro: Tem que ter " x " e não ser cabeçalho
            if (texto.includes(' x ') && !texto.includes('ESTATÍSTICAS')) {
                
                // Busca o número da média (padrão de 2 dígitos, ex: 11, 12, 18)
                const matchNumeros = texto.match(/(\d{2})/);
                
                if (matchNumeros) {
                    const media = parseInt(matchNumeros[0]);
                    
                    // Filtro de Média > 11
                    if (media > 11 && media <= 25) { // 25 é um teto seguro para evitar erros de leitura
                        const matchConfronto = texto.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                        
                        if (matchConfronto) {
                            const confronto = matchConfronto[0].trim();
                            
                            // Evita enviar o mesmo jogo várias vezes na mesma execução
                            if (!jogosEnviados.has(confronto)) {
                                jogosEnviados.add(confronto);
                                
                                const msg = `⚽ *ALERTA DE ESCANTEIOS*\n\n` +
                                            `⚔️ *Confronto:* ${confronto}\n` +
                                            `📊 *Média Detectada:* ${media}\n\n` +
                                            `🚀 _Samuel Mega Bot_`;
                                            
                                bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(console.error);
                                console.log(`✅ Jogo enviado: ${confronto} | Média: ${media}`);
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

// Verifica a cada 10 minutos
setInterval(monitorarJogos, 600000); 
monitorarJogos();
