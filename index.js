const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot de Escanteios Ativo'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

// Controle de memória para não enviar o mesmo jogo 2 vezes
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
        
        $('tr, div, li').each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Filtro para ignorar cabeçalhos
            if (linha.includes('ESTATÍSTICAS DE ESCANTEIOS')) {
                
                // Regex para encontrar todos os números no formato X.X
                const numeros = linha.match(/\d{1,2}\.\d/g);
                
                if (numeros && numeros.length >= 3) {
                    // O último número geralmente é a média total (ex: 5.9, 5.8, 11.7)
                    const mediaTotal = parseFloat(numeros[numeros.length - 1]);
                    
                    if (mediaTotal > 10.5) {
                        const nomeJogo = linha.split('ESTATÍSTICAS')[0]; // Pega o nome da liga/jogo
                        
                        // Verifica duplicidade
                        if (!jogosEnviados.has(nomeJogo)) {
                            jogosEnviados.add(nomeJogo);
                            bot.sendMessage(CHAT_ID, `🔥 *Oportunidade Encontrada!*\n\n${nomeJogo}\n📊 *Média Total:* ${mediaTotal} cantos`).catch(console.error);
                            console.log(`[ALERTA ENVIADO] ${nomeJogo} -> ${mediaTotal}`);
                        }
                    }
                }
            }
        });
        
    } catch (e) {
        console.error("Erro na leitura:", e.message);
    }
}

// Reseta a lista de duplicados a cada 24h
setInterval(() => { jogosEnviados.clear(); }, 86400000);
// Roda a cada 15 minutos
setInterval(monitorarJogos, 900000); 
monitorarJogos();
