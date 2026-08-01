const express = require('express');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Caçador de API ⚽🚩</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function cacarAPI() {
    try {
        console.log("🕵️‍♂️ Caçando a API oculta do SokkerPRO...");
        
        // Tentativa de requisição simulando um app mobile buscando dados internos
        const response = await axios.get('https://m.sokkerpro.com/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36',
                'Accept': 'application/json, text/plain, */*'
            },
            timeout: 10000
        });

        console.log("Status da resposta:", response.status);
        console.log("Tamanho do conteúdo retornado:", response.data.length);

        // Se o conteúdo retornar dados em texto, vamos investigar se há links de API no HTML
        let html = response.data;
        let matches = html.match(/https?:\/\/[^\s"'<>]+api[^\s"'<>]+/gi) || [];
        
        console.log("APIs encontradas no código:", matches);

    } catch (erro) {
        console.error("❌ Erro na caça:", erro.message);
    }
}

cacarAPI();
setInterval(cacarAPI, 60000);
