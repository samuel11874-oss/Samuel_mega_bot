const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Direto 10.5'));
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
            timeout: 20000
        });

        const $ = cheerio.load(response.data);
        const linhas = $('tr'); // Busca todas as linhas da tabela

        linhas.each((i, el) => {
            const linhaTexto = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Só processa se tiver confronto
            if (linhaTexto.includes(' x ')) {
                // Substitui vírgula por ponto para garantir a leitura
                const textoLimpo = linhaTexto.replace(',', '.');
                
                // Busca números no formato XX.X
                const matchNumeros = textoLimpo.match(/(\d{2}\.\d)/g);
                
                if (matchNumeros) {
                    for (let n of matchNumeros) {
                        const valor = parseFloat(n);
                        
                        // CRITÉRIO: Média > 10.5 e < 15.0 (ignora minutos de jogo)
                        if (valor > 10.5 && valor < 15.0) {
                            const confrontoMatch = linhaTexto.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                            const confronto = confrontoMatch ? confrontoMatch[0].trim() : null;

                            if (confronto && !jogosEnviados.has(confronto)) {
                                jogosEnviados.add(confronto);
                                
                                const mensagem = `⚽ ${confronto}\n` +
                                                 `📊 Média: ${valor}`;
                                
                                bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                                console.log(`✅ Enviado: ${confronto} | Média: ${valor}`);
                            }
                            // Achou uma média válida, não precisa verificar outros números nesta linha
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

// Reseta cache a cada 24h
setInterval(() => { jogosEnviados.clear(); }, 86400000); 
// Varre a cada 5 minutos
setInterval(monitorarJogos, 300000); 
monitorarJogos();
