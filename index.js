const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Limpeza'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

let jogosEnviados = new Set();
const dataHoje = "16 de julho";

// Função para limpar nomes repetidos (ex: "Liga X Liga X" vira "Liga X")
function limparTextoRepetido(texto) {
    if (!texto) return "Liga Desconhecida";
    const palavras = texto.split(' ');
    const metade = Math.floor(palavras.length / 2);
    const primeiraMetade = palavras.slice(0, metade).join(' ');
    const segundaMetade = palavras.slice(metade).join(' ');
    
    // Se a primeira metade for igual à segunda, remove a repetição
    if (primeiraMetade === segundaMetade) return primeiraMetade;
    return texto;
}

async function monitorarJogos() {
    try {
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const elementos = $('div, tr, li, td');
        
        let ligaAtual = "Liga Desconhecida";

        elementos.each((i, el) => {
            const texto = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Captura a Liga e limpa a poluição
            if (texto.includes("ESTATÍSTICAS DE ESCANTEIOS")) {
                let tempLiga = texto.replace("ESTATÍSTICAS DE ESCANTEIOS", "").trim();
                ligaAtual = limparTextoRepetido(tempLiga);
            }

            if (texto.includes(' x ')) {
                // Filtro de data
                if (texto.includes("de julho") && !texto.includes(dataHoje)) return;

                const numeros = texto.match(/\d{1,2}\.\d/g);
                if (numeros && numeros.length >= 2) {
                    const mediaTotal = parseFloat(numeros[numeros.length - 1]);

                    if (mediaTotal > 10.5 && mediaTotal < 50) {
                        const regexConfronto = /([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/;
                        const matchConfronto = texto.match(regexConfronto);
                        
                        if (matchConfronto) {
                            // Pega apenas o primeiro confronto encontrado na string limpa
                            let confronto = matchConfronto[0].trim();
                            
                            if (confronto && !jogosEnviados.has(confronto)) {
                                jogosEnviados.add(confronto);
                                
                                const mensagem = `🔥 *Oportunidade de Hoje*\n` +
                                                 `🏆 *Liga:* ${ligaAtual}\n` +
                                                 `⚽ *Confronto:* ${confronto}\n` +
                                                 `📊 *Média Total:* ${mediaTotal}`;

                                bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                            }
                        }
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(monitorarJogos, 600000); 
monitorarJogos();
