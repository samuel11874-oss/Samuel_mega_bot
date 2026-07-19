const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot em Diagnóstico'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

let jogosEnviados = new Set();

async function monitorarJogos() {
    console.log("🔍 Iniciando nova varredura no site...");
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let encontrados = 0;
        
        // Verificação ampla: vamos ler todas as linhas da tabela
        $('tr').each((i, el) => {
            const texto = $(el).text().trim();
            
            // Log de diagnóstico: vamos ver o que ele lê
            if (texto.includes(' x ')) {
                console.log("DEBUG_LINHA: " + texto.substring(0, 50)); 
                
                // Extração simples
                const match = texto.match(/([A-Za-zÀ-ÿ\s]{3,})\s?x\s?([A-Za-zÀ-ÿ\s]{3,})/i);
                if (match) {
                    encontrados++;
                    const msg = `⚽ *Teste (DEBUG)*: ${match[1].trim()} x ${match[2].trim()}`;
                    bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                    console.log(`✅ ENVIADO (DEBUG): ${match[1].trim()} x ${match[2].trim()}`);
                }
            }
        });
        
        console.log(`🔍 Varredura concluída. Total de jogos encontrados: ${encontrados}`);
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(() => { jogosEnviados.clear(); }, 3600000); 
setInterval(monitorarJogos, 300000); 
monitorarJogos();
