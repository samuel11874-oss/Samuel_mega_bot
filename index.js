const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot de Diagnóstico Ativo'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.windrawwin.com/'
};

async function monitorarJogos() {
    try {
        console.log("Iniciando varredura de diagnóstico...");
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        
        // Vamos imprimir um pedaço grande do HTML para ver a estrutura
        console.log("Conteúdo da página (primeiros 500 caracteres):");
        console.log(data.substring(0, 500));
        
        const $ = cheerio.load(data);
        
        // Verifica se existem tabelas na página
        const totalTabelas = $('table').length;
        console.log(`Total de tabelas encontradas na página: ${totalTabelas}`);
        
        // Imprime o texto das primeiras 5 linhas que encontrar
        $('tr').slice(0, 5).each((i, el) => {
            console.log(`LINHA ${i}: ${$(el).text().trim().substring(0, 50)}`);
        });

    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(monitorarJogos, 300000); 
monitorarJogos();
