const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Limpeza Total'));
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

// Função para remover o "lixo" da string
function limparTexto(texto) {
    return texto
        .replace(/ESTATÍSTICAS DE ESCANTEIOS/gi, '')
        .replace(/Mais\s?\d+[\d.]*/gi, '')
        .replace(/Menos\s?\d+[\d.]*/gi, '')
        .replace(/Hoje/gi, '')
        .replace(/Começa em \d+ minutos/gi, '')
        .replace(/\d{1,2} de [a-zç]+( de \d{4})?/gi, '') // Remove datas
        .replace(/\s+/g, ' ')
        .trim();
}

async function monitorarJogos() {
    try {
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        // Foca em elementos que contêm os jogos
        const elementos = $('tr'); 
        
        let ligaAtual = "Liga Desconhecida";

        elementos.each((i, el) => {
            const linhaBruta = $(el).text().trim();
            
            // Tenta identificar se é uma linha de liga
            if (linhaBruta.includes("ESTATÍSTICAS DE ESCANTEIOS")) {
                ligaAtual = linhaBruta.replace("ESTATÍSTICAS DE ESCANTEIOS", "").trim();
                return;
            }

            // Filtro para apenas linhas de jogos
            if (linhaBruta.includes(' x ')) {
                // Filtro de data rigoroso (se houver data na linha e não for hoje, pula)
                if (linhaBruta.includes("de julho") && !linhaBruta.includes("16 de julho")) return;

                const numeros = linhaBruta.match(/\d{1,2}\.\d/g);
                if (numeros && numeros.length >= 2) {
                    const mediaTotal = parseFloat(numeros[numeros.length - 1]);

                    if (mediaTotal > 10.5 && mediaTotal < 50) {
                        const matchConfronto = linhaBruta.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                        
                        if (matchConfronto) {
                            let confronto = matchConfronto[0].trim();
                            
                            // Cria um ID único para o jogo
                            let chaveUnica = `${ligaAtual}-${confronto}`;
                            
                            if (!jogosEnviados.has(chaveUnica)) {
                                jogosEnviados.add(chaveUnica);
                                
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
