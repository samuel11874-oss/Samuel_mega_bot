const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Estrutura de Tabela Ativa'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

let jogosEnviados = new Set();

async function monitorarJogos() {
    try {
        console.log("--- Varredura Profunda em Tabelas Iniciada ---");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        
        // Agora buscamos cada linha de tabela (tr), que é onde os jogos realmente ficam
        $('table tr').each(async (i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Log de Debug: Se quiser ver tudo o que ele lê, descomente a linha abaixo
            // console.log(`Linha ${i}: ${linha.substring(0, 50)}`);

            // Filtro: Tem que ter "Amanhã" e ter um confronto " x "
            if (linha.includes('Amanhã') && linha.includes(' x ')) {
                
                // Busca média decimal (ex: 10.5)
                const matchMedia = linha.match(/(\d{1,2}\.\d{1,2})/);
                
                if (matchMedia) {
                    const media = parseFloat(matchMedia[0]);
                    
                    // Critério: Média > 11
                    if (media > 11.0) {
                        
                        const matchConfronto = linha.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                        
                        if (matchConfronto) {
                            const confronto = matchConfronto[0].trim();
                            
                            if (!jogosEnviados.has(confronto)) {
                                jogosEnviados.add(confronto);
                                
                                const msg = `⚽ *JOGO DE AMANHÃ*\n\n` +
                                            `⚔️ *Confronto:* ${confronto}\n` +
                                            `📊 *Média de Escanteios:* ${media}\n\n` +
                                            `🚀 _Samuel Mega Bot_`;
                                            
                                await bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' });
                                console.log(`✅ Jogo enviado: ${confronto} | Média: ${media}`);
                                await wait(3000); // Anti-bloqueio
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
