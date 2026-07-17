const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Todos os Jogos'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

let jogosEnviados = new Set();
const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function getDataHoje() {
    const agora = new Date();
    return `${agora.getDate()} de ${meses[agora.getMonth()]}`;
}

async function monitorarJogos() {
    try {
        const dataHoje = getDataHoje();
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 20000
        });

        const $ = cheerio.load(response.data);
        const elementos = $('tr'); // Busca todas as linhas de tabela

        elementos.each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Verifica se a linha contém um confronto
            if (linha.includes(' x ')) {
                
                // Filtro de data: ignora se não for de hoje
                // (Se o site não mostrar a data em todas as linhas, este filtro garante que apenas o dia atual passe)
                if (linha.includes("de julho") && !linha.includes(dataHoje)) {
                    return;
                }

                // Identifica o confronto
                const regexConfronto = /([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/;
                const matchConfronto = linha.match(regexConfronto);
                const confronto = matchConfronto ? matchConfronto[0].trim() : null;

                // Envia sem critérios numéricos, apenas verificando se já não foi enviado
                if (confronto && !jogosEnviados.has(confronto)) {
                    jogosEnviados.add(confronto);
                    
                    const mensagem = `⚽ ${confronto}`;
                    bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reseta cache a cada 24 horas
setInterval(() => { jogosEnviados.clear(); }, 86400000); 
// Busca a cada 10 minutos
setInterval(monitorarJogos, 600000); 
monitorarJogos();
