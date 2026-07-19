const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Focado em Tabelas'));
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

        // Foca APENAS dentro de tabelas (evita o menu e rodapé)
        $('table').each((i, table) => {
            $(table).find('tr').each((j, row) => {
                const texto = $(row).text().trim();
                
                // Se a linha tem "x" ou "vs", é um provável jogo
                if (texto.includes(' x ') || texto.includes(' vs ')) {
                    
                    // Regex para capturar números decimais (ex: 10.5)
                    const numeros = texto.match(/(\d{1,2}[.,]\d)/g);
                    
                    if (numeros && numeros.length >= 2) {
                        const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                        
                        // Filtro de Média (ajuste conforme necessário)
                        if (media > 9.5 && media <= 15.0) {
                            const timeA = texto.split(' x ')[0] || "Time A";
                            const timeB = texto.split(' x ')[1] || "Time B";
                            
                            const chave = (timeA + timeB).substring(0, 15).replace(/\s+/g, '');
                            
                            if (!jogosEnviados.has(chave)) {
                                jogosEnviados.add(chave);
                                encontrados++;
                                
                                const msg = `⚽ *Oportunidade*\n` +
                                            `⚔️ *${timeA.trim()} x ${timeB.trim()}*\n` +
                                            `📊 *Média: ${media.toFixed(1)}*`;
                                            
                                bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                                console.log(`✅ ENVIADO: ${timeA.trim()} x ${timeB.trim()} | Média: ${media.toFixed(1)}`);
                            }
                        }
                    }
                }
            });
        });
        
        console.log(`🔍 Varredura concluída. Novos jogos hoje: ${encontrados}`);
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(() => { jogosEnviados.clear(); }, 7200000);
setInterval(monitorarJogos, 300000); 
monitorarJogos();
