const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Filtro de Precisão Ativo'));
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
        console.log("Iniciando varredura com filtro de precisão...");
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let encontrados = 0;

        // Foco total na classe 'statln2' que o seu log revelou
        $('.statln2').each((i, el) => {
            const fullText = $(el).text().trim();

            // A regra de ouro: SÓ processa se contiver "Hoje" e o separador " x "
            if (fullText.includes('Hoje') && fullText.includes(' x ')) {
                
                // Limpeza: remove "Hoje" e corta tudo o que for número (odds)
                // Isso deixa apenas os nomes dos times
                let cleanText = fullText.replace('Hoje', '').split(/[0-9]/)[0].trim();
                
                if (cleanText.includes(' x ')) {
                    const chave = cleanText.toLowerCase().replace(/\s/g, '');
                    
                    if (!jogosEnviados.has(chave)) {
                        jogosEnviados.add(chave);
                        encontrados++;
                        
                        const msg = `⚽ *Oportunidade (HOJE)*\n\n*${cleanText}*`;
                        bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                        console.log(`✅ ENVIADO HOJE: ${cleanText}`);
                    }
                }
            }
        });
        
        console.log(`Varredura concluída. Jogos de hoje encontrados e enviados: ${encontrados}`);
        
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Limpa memória a cada 24h
setInterval(() => { jogosEnviados.clear(); }, 86400000); 
// Verifica a cada 5 minutos
setInterval(monitorarJogos, 300000); 

monitorarJogos();
