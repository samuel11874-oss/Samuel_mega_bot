const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot em Modo de Diagnóstico'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

async function diagnosticar() {
    try {
        console.log(`🔍 Iniciando varredura diagnóstica...`);
        
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 20000
        });

        // Debug: Tamanho da página
        console.log(`📊 Tamanho da página recebida: ${response.data.length} caracteres.`);

        const $ = cheerio.load(response.data);
        
        // Debug: Pegar texto de um elemento que sabemos que existe (ex: tag h1)
        const titulo = $('h1').text();
        console.log(`📌 Título da página detectado: ${titulo}`);

        // Tenta pegar qualquer texto que contenha " x " na página inteira
        const textoCompleto = $('body').text();
        const linhas = textoCompleto.split('\n');
        
        let encontrouAlgo = false;
        linhas.forEach(linha => {
            if (linha.includes(' x ') && linha.length > 10 && linha.length < 100) {
                console.log(`✅ LINHA ENCONTRADA: ${linha.trim()}`);
                encontrouAlgo = true;
            }
        });

        if (!encontrouAlgo) {
            console.log(`⚠️ Alerta: Não encontramos linhas com " x " na estrutura atual da página.`);
        }

    } catch (e) {
        console.error("❌ ERRO na requisição:", e.message);
    }
}

// Roda imediatamente
diagnosticar();
