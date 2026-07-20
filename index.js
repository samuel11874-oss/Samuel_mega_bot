const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Modo Leitura Total'));
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
        
        // Loop que varre a página procurando por elementos que parecem jogos
        $('div, a').each((i, el) => {
            const texto = $(el).text().trim();
            
            // Debug: O que o bot está lendo? (Veja isso no Log do Render)
            if (texto.includes(' x ') && texto.length < 60) {
                console.log(`Lendo: ${texto}`);
            }

            // Regra: Tem que ter " x "
            if (texto.includes(' x ')) {
                
                // Filtro "Anti-Lixo" (palavras que aparecem em menus)
                const lixo = ["WinDrawWin", "Palpites", "Jogos", "Estatísticas", "Página", "Total", "Próxima", "Brasileirão", "Mais", "Menos", "Home", "Odds", "Average"];
                const contemLixo = lixo.some(termo => texto.toLowerCase().includes(termo.toLowerCase()));

                if (!contemLixo && texto.length < 60) {
                    const match = texto.match(/([A-Za-zÀ-ÿ\s]{3,})\s?x\s?([A-Za-zÀ-ÿ\s]{3,})/i);
                    
                    if (match) {
                        const t1 = match[1].trim();
                        const t2 = match[2].trim();
                        const chave = (t1 + t2).toLowerCase().replace(/\s/g, '');
                        
                        if (!jogosEnviados.has(chave)) {
                            jogosEnviados.add(chave);
                            const msg = `⚽ *Oportunidade:* ${t1} x ${t2}`;
                            bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                            console.log(`✅ ENVIADO: ${t1} x ${t2}`);
                        }
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(() => { jogosEnviados.clear(); }, 3600000); 
setInterval(monitorarJogos, 300000); 
monitorarJogos();
