const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot de Escanteios Otimizado'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

let jogosEnviados = new Set();

function estaNoHorario() {
    const agora = new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"});
    const hora = new Date(agora).getHours();
    return (hora >= 6 && hora <= 11) || (hora >= 12 && hora <= 20);
}

async function monitorarJogos() {
    if (!estaNoHorario()) return;

    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        const $ = cheerio.load(data);
        
        // Foco apenas nas linhas que contêm um confronto " x "
        $('tr').each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');
            
            if (linha.includes(' x ')) {
                // Extrai o confronto: Busca o padrão "NomeTime x NomeTime"
                // O regex abaixo captura [Letras/Espaços] x [Letras/Espaços]
                const regexConfronto = /([A-Za-zÀ-ÿ0-9\s]+)\sx\s([A-Za-zÀ-ÿ0-9\s]+)/;
                const matchConfronto = linha.match(regexConfronto);
                
                // Extrai números para calcular a média
                const numeros = linha.match(/\d{1,2}\.\d/g);
                
                if (matchConfronto && numeros && numeros.length >= 3) {
                    const nomeDoJogo = matchConfronto[0].trim(); // Ex: "Viking FK x Sandefjord"
                    const mediaTotal = parseFloat(numeros[numeros.length - 1]);
                    
                    if (mediaTotal > 10.5) {
                        // Verifica duplicidade usando o nome do jogo como chave
                        if (!jogosEnviados.has(nomeDoJogo)) {
                            jogosEnviados.add(nomeDoJogo);
                            bot.sendMessage(CHAT_ID, `🔥 *Oportunidade:* ${nomeDoJogo}\n📊 *Média:* ${mediaTotal} cantos`).catch(console.error);
                            console.log(`[ALERTA ENVIADO] ${nomeDoJogo} -> ${mediaTotal}`);
                        }
                    }
                }
            }
        });
        
    } catch (e) {
        console.error("Erro na leitura:", e.message);
    }
}

setInterval(() => { jogosEnviados.clear(); }, 86400000);
setInterval(monitorarJogos, 900000); 
monitorarJogos();
