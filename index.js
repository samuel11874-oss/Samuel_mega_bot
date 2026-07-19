const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot em Diagnóstico de Estrutura'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function monitorarJogos() {
    console.log("🔍 Iniciando varredura...");
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        
        console.log("✅ Página baixada com sucesso!");
        console.log("Tamanho da página: " + data.length + " bytes");
        
        const $ = cheerio.load(data);
        
        // Vamos olhar em TUDO (todas as divs) para ver o que achamos
        let contador = 0;
        $('div').each((i, el) => {
            const texto = $(el).text().trim();
            
            // Log apenas dos primeiros 20 elementos para não travar o log do Render
            if (contador < 20) {
                console.log("DEBUG_CONTEUDO: " + texto.substring(0, 60));
                contador++;
            }

            // Tentativa de achar o padrão "Time x Time" em qualquer div
            if (texto.includes(' x ') && texto.length < 100) {
                console.log("ACHEI ALGO QUE PARECE JOGO: " + texto);
            }
        });
        
        console.log("🔍 Varredura concluída.");
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(monitorarJogos, 300000); // 5 minutos
monitorarJogos();
