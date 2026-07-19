const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Leitura Robusta'));
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
        console.log("--- INICIANDO LEITURA DAS LINHAS ---");

        // Vamos percorrer todas as linhas da tabela
        $('tr').each((i, el) => {
            const linhaTexto = $(el).text().trim();
            
            // LOG DE DEBUG: Imprime as primeiras 10 linhas para eu saber o que o site entrega
            if (i < 10) console.log(`Linha ${i}: ${linhaTexto.substring(0, 60)}...`);

            // Procura o padrão de jogo (Time vs Time ou Time x Time)
            // Também aceita números decimais (ex: 10.5)
            if (linhaTexto.includes(' x ') || linhaTexto.includes(' vs ')) {
                const numeros = linhaTexto.match(/(\d{1,2}[.,]\d)/g);
                
                if (numeros && numeros.length >= 2) {
                    const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                    
                    if (media > 9.5 && media <= 15.0) {
                        encontrados++;
                        const chave = linhaTexto.substring(0, 20).replace(/\s+/g, '');
                        
                        if (!jogosEnviados.has(chave)) {
                            jogosEnviados.add(chave);
                            const msg = `⚽ *Oportunidade*\n` + `📝 *${linhaTexto.substring(0, 50)}...*\n` + `📊 *Média: ${media.toFixed(1)}*`;
                            bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                        }
                    }
                }
            }
        });
        
        console.log(`--- LEITURA FINALIZADA. Jogos encontrados: ${encontrados} ---`);
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(() => { jogosEnviados.clear(); }, 7200000);
setInterval(monitorarJogos, 300000); 
monitorarJogos();
