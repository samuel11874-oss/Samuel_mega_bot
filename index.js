const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot em Modo Diagnóstico'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Referer': 'https://www.google.com/'
};

async function diagnosticarSite() {
    try {
        console.log("--- Tentando acessar o site ---");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 20000
        });

        console.log("Status do Site:", response.status);
        console.log("Tamanho da página recebida:", response.data.length);
        
        // Vamos ver um pedaço do HTML para saber se o site está bloqueando
        const snippet = response.data.substring(0, 500);
        console.log("Início do HTML recebido:", snippet);

        const $ = cheerio.load(response.data);
        
        // Procura qualquer coisa que se pareça com um nome de time ou jogo no corpo todo
        const textoBody = $('body').text();
        if (textoBody.includes(' x ')) {
            console.log("SUCESSO: Encontrei ' x ' no texto da página!");
        } else {
            console.log("ERRO: Não encontrei nenhum ' x ' (jogo) na página.");
        }

    } catch (e) {
        console.error("ERRO CRÍTICO NA CONEXÃO:", e.message);
    }
}

setInterval(diagnosticarSite, 300000); 
diagnosticarSite();
