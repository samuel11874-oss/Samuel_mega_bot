const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Filtro de Data Ativo'));
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
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 20000
        });

        const $ = cheerio.load(response.data);
        
        // Focando nas linhas de tabela
        $('tr').each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');

            // --- FILTRO DE DATA ---
            // Só processa se a linha contiver "Hoje" ou a data de hoje "17 de julho"
            const eHoje = linha.includes("Hoje") || linha.includes("17 de julho");
            
            if (eHoje && linha.includes(' x ')) {
                
                // Regex para capturar o confronto
                const regexConfronto = /([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/;
                const matchConfronto = linha.match(regexConfronto);
                const confronto = matchConfronto ? matchConfronto[0].trim() : null;

                // Captura a média numérica (independente de valor)
                const numeros = linha.match(/\d{1,2}\.\d/g);
                const valor = numeros ? numeros[0] : "N/A";

                if (confronto && !jogosEnviados.has(confronto)) {
                    jogosEnviados.add(confronto);

                    const mensagem = `⚽ *Jogo de Hoje*\n` +
                                     `*Confronto:* ${confronto}\n` +
                                     `📊 *Média:* ${valor}`;

                    bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                    console.log(`✅ Enviado (Hoje): ${confronto} | Média: ${valor}`);
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Limpa cache diariamente
setInterval(() => { jogosEnviados.clear(); }, 86400000); 

// Varredura a cada 5 minutos
setInterval(monitorarJogos, 300000); 

// Primeira execução
monitorarJogos();
