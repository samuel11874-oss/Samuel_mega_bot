const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Modo Raio-X'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function monitorarJogos() {
    console.log(`🔍 Iniciando Raio-X da página...`);
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        // Diagnóstico: Quantas tabelas e linhas existem no HTML?
        const tabelas = $('table').length;
        const linhas = $('tr').length;
        console.log(`DEBUG: Encontrei ${tabelas} tabelas e ${linhas} linhas (tr) na página.`);

        // Se encontrar 0 linhas, vamos ver o conteúdo do corpo da página para entender o erro
        if (linhas === 0) {
            console.log("DEBUG: Nenhuma linha (tr) encontrada. Imprimindo trecho do HTML para análise:");
            console.log($('body').html().substring(0, 1000));
        } else {
            // Se encontrar linhas, vamos imprimir o conteúdo da primeira linha para ver a estrutura
            console.log("DEBUG: Primeira linha encontrada contém:", $('tr').first().text().substring(0, 200));
        }
        
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(monitorarJogos, 60000); // 1 minuto para ver o log rápido
monitorarJogos();
