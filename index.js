const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Novo Layout Ativo'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function monitorarJogos() {
    console.log("🔍 [NOVO LAYOUT] Iniciando leitura...");
    
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/');
        const $ = cheerio.load(data);
        
        // Selecionamos as linhas do novo layout
        const linhas = $('.wttrtab, .wttr2');
        
        if (linhas.length === 0) {
            console.log("⚠️ Nenhuma linha encontrada com as classes .wttrtab ou .wttr2");
            return;
        }

        console.log(`🔍 [NOVO LAYOUT] Linhas encontradas: ${linhas.length}`);

        linhas.each((i, el) => {
            // Extraindo o texto de todas as colunas .wttd da linha
            const colunas = $(el).find('.wttd');
            
            // Vamos logar apenas as primeiras 3 linhas para não lotar o log
            if (i < 3) {
                let info = "";
                colunas.each((j, col) => {
                    info += `[${j}: ${$(col).text().trim()}] `;
                });
                console.log(`Jogo ${i}: ${info}`);
            }
        });
    } catch (error) {
        console.error("❌ Erro:", error.message);
    }
}

// Rodar a cada 1 minuto
setInterval(monitorarJogos, 60000);
monitorarJogos();
