const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Detetive'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Accept-Language': 'pt-BR,pt;q=0.9'
};

let jogosEnviados = new Set();

async function monitorarJogos() {
    try {
        console.log("Acessando o site...");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 30000
        });

        const $ = cheerio.load(response.data);
        const htmlTotal = $('body').text();
        console.log(`Página carregada. Tamanho do conteúdo: ${htmlTotal.length} caracteres.`);

        // Vamos procurar qualquer texto que contenha " x " na página toda
        // para ver se pelo menos o texto dos jogos está vindo
        const conteudos = $('div, tr, li, p'); 
        let achouAlgum = false;

        conteudos.each((i, el) => {
            const linha = $(el).text().trim();
            if (linha.includes(' x ') && linha.length < 100) { // Jogos curtos
                console.log(`Jogo encontrado no seletor: ${linha}`);
                achouAlgum = true;
                
                if (!jogosEnviados.has(linha)) {
                    jogosEnviados.add(linha);
                    bot.sendMessage(CHAT_ID, `⚽ ${linha}`).catch(console.error);
                }
            }
        });

        if (!achouAlgum) {
            console.log("Nenhum jogo encontrado com o seletor padrão. Verificando amostra do HTML...");
            console.log(htmlTotal.substring(0, 500)); // Imprime um pedaço para eu ver
        }

    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(() => { jogosEnviados.clear(); }, 86400000); 
setInterval(monitorarJogos, 300000); 
monitorarJogos();
