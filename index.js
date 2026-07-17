const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Captura 10.5+'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

let jogosEnviados = new Set();

async function monitorarJogos() {
    try {
        console.log("Iniciando varredura...");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 30000
        });

        const $ = cheerio.load(response.data);
        
        // Vamos varrer parágrafos, tabelas e divs para garantir que pegamos tudo
        const elementos = $('tr, div, p'); 

        elementos.each((i, el) => {
            const linhaTexto = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Filtro para achar jogos
            if (linhaTexto.includes(' x ')) {
                // Converte vírgula para ponto e captura números como 10.6, 11.2, 10,5 etc
                const textoLimpo = linhaTexto.replace(',', '.');
                const matchNumeros = textoLimpo.match(/(\d{2}\.\d)/g);
                
                if (matchNumeros) {
                    for (let n of matchNumeros) {
                        const valor = parseFloat(n);
                        
                        // DEBUG: Se o valor for próximo de 10, veremos no log
                        if (valor > 10.0) {
                            console.log(`Debug: Encontrei valor ${valor} na linha: ${linhaTexto.substring(0, 30)}...`);
                        }

                        // CRITÉRIO FINAL: Acima de 10.5
                        if (valor > 10.5 && valor < 15.0) {
                            const confrontoMatch = linhaTexto.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                            const confronto = confrontoMatch ? confrontoMatch[0].trim() : null;

                            if (confronto && !jogosEnviados.has(confronto)) {
                                jogosEnviados.add(confronto);
                                
                                const mensagem = `⚽ *${confronto}*\n📊 Média FT: ${valor}`;
                                bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                                console.log(`✅ Jogo enviado: ${confronto} com média ${valor}`);
                            }
                            break; 
                        }
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(() => { jogosEnviados.clear(); }, 86400000); 
setInterval(monitorarJogos, 300000); 
monitorarJogos();
