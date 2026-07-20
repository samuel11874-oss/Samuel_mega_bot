const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Filtro de Hoje Ativo'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.windrawwin.com/br/estatisticas/escanteios/'
};

let jogosEnviados = new Set();

async function monitorarJogos() {
    try {
        console.log("Buscando jogos apenas para HOJE...");
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let processar = false; // Flag para saber se estamos na seção de hoje
        let encontrados = 0;

        // Vamos percorrer os elementos principais da página
        // O WinDrawWin geralmente usa <h3> para títulos de data
        $('h3, tr, div').each((i, el) => {
            const texto = $(el).text().trim();
            const textoLower = texto.toLowerCase();

            // 1. Detectar início da seção "Hoje"
            if (textoLower.includes('hoje') && !textoLower.includes('jogado hoje')) {
                processar = true;
                return;
            }

            // 2. Detectar quando acaba "Hoje" (começa "Amanhã" ou outras datas)
            if (textoLower.includes('amanhã') || textoLower.includes('jogado hoje') || textoLower.includes('ontem')) {
                processar = false;
            }

            // 3. Processar jogos apenas se estivermos na seção de "Hoje"
            if (processar && texto.includes(' x ')) {
                const match = texto.match(/([A-Za-zÀ-ÿ\s]{3,})\s?x\s?([A-Za-zÀ-ÿ\s]{3,})/i);
                
                if (match) {
                    const t1 = match[1].trim();
                    const t2 = match[2].trim();
                    const chave = (t1 + t2).toLowerCase().replace(/\s/g, '');
                    
                    if (!jogosEnviados.has(chave)) {
                        jogosEnviados.add(chave);
                        encontrados++;
                        
                        const msg = `⚽ *Oportunidade (Hoje)*\n\n*${t1} x ${t2}*`;
                        bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                        console.log(`✅ ENVIADO HOJE: ${t1} x ${t2}`);
                    }
                }
            }
        });
        
        console.log(`Varredura concluída. Jogos de hoje encontrados: ${encontrados}`);
        
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Limpa memória a cada 24h
setInterval(() => { jogosEnviados.clear(); }, 86400000); 
// Verifica a cada 5 minutos
setInterval(monitorarJogos, 300000); 

monitorarJogos();
