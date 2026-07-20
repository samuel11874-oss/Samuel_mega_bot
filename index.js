const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Filtro Rigoroso Ativo'));
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
        console.log("Iniciando varredura com filtro rigoroso de data...");
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let processar = false; 
        let encontrados = 0;

        // Itera sobre elementos de estrutura de lista/tabela
        $('tr, div, h3').each((i, el) => {
            const texto = $(el).text().trim();
            const textoLower = texto.toLowerCase();

            // 1. ATIVAÇÃO: Só processa se ler "Hoje"
            if (textoLower.includes('hoje') && !textoLower.includes('jogado hoje')) {
                processar = true;
                return;
            }

            // 2. BLOQUEIO TOTAL: Se ler qualquer uma dessas palavras, o bot para de processar imediatamente
            const palavrasDeBloqueio = ['amanhã', 'ontem', 'jogado hoje', 'july 21', 'july 22', 'july 23', 'jul 21', 'jul 22'];
            if (palavrasDeBloqueio.some(p => textoLower.includes(p))) {
                processar = false;
                return;
            }

            // 3. PROCESSAMENTO: Só envia se estiver na seção de hoje E tiver ' x '
            if (processar && texto.includes(' x ') && texto.length < 100) {
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
