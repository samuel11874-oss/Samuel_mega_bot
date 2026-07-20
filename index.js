const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Filtro de Sentinela Ativo'));
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
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let isToday = false;
        let encontrados = 0;

        // Varre os itens do menu que descobrimos que guardam os jogos
        $('.menu-item-content').each((i, el) => {
            const texto = $(el).text().trim();
            const textoLower = texto.toLowerCase();

            // 1. SINALIZADORES DE DATA
            // Se encontrar "Segunda" ou "20" (hoje é 20 de julho), ativamos o modo Hoje
            if (textoLower.includes('segunda') || textoLower.includes('20')) {
                isToday = true;
                return; // Pula a linha do cabeçalho
            }
            
            // Se encontrar qualquer outro dia, desativamos
            if (textoLower.includes('terça') || textoLower.includes('quarta') || 
                textoLower.includes('quinta') || textoLower.includes('sexta') || 
                textoLower.includes('sábado') || textoLower.includes('domingo') ||
                textoLower.includes('amanhã')) {
                isToday = false;
                return;
            }

            // 2. PROCESSAMENTO: Só envia se estiver no modo "Hoje" E for jogo (tem " x ")
            if (isToday && texto.includes(' x ')) {
                const match = texto.match(/([A-Za-zÀ-ÿ\s]{3,})\s?x\s?([A-Za-zÀ-ÿ\s]{3,})/i);
                
                if (match) {
                    const t1 = match[1].trim();
                    const t2 = match[2].trim();
                    const chave = (t1 + t2).toLowerCase().replace(/\s/g, '');
                    
                    if (!jogosEnviados.has(chave)) {
                        jogosEnviados.add(chave);
                        encontrados++;
                        
                        const msg = `⚽ *Oportunidade (HOJE)*\n\n*${t1} x ${t2}*`;
                        bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                        console.log(`✅ ENVIADO HOJE: ${t1} x ${t2}`);
                    }
                }
            }
        });
        
        console.log(`Varredura concluída. Jogos processados hoje: ${encontrados}`);
        
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(() => { jogosEnviados.clear(); }, 86400000); 
setInterval(monitorarJogos, 300000); 
monitorarJogos();
