const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Filtrado'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

let jogosEnviados = new Set();

async function monitorarJogos() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let encontrados = 0;
        console.log("--- BUSCANDO DADOS NA TABELA ---");

        // IGNORA O MENU E FOCA NAS TABELAS
        $('table').not('.menu-item-content').each((i, table) => {
            $(table).find('tr').each((j, row) => {
                const linhaTexto = $(row).text().trim();
                
                // Filtra para garantir que é uma linha de jogo com números (médias)
                if (linhaTexto.includes(' x ') && /\d/.test(linhaTexto)) {
                    
                    // Regex para capturar números decimais (ex: 9.5, 10.4)
                    const numeros = linhaTexto.match(/(\d{1,2}[.,]\d)/g);
                    
                    if (numeros && numeros.length >= 2) {
                        const media1 = parseFloat(numeros[0].replace(',', '.'));
                        const media2 = parseFloat(numeros[1].replace(',', '.'));
                        const mediaTotal = media1 + media2;
                        
                        // Sua regra: Média entre 9.5 e 15.0
                        if (mediaTotal > 9.5 && mediaTotal <= 15.0) {
                            encontrados++;
                            const nomeJogo = linhaTexto.split(' ').slice(0, 5).join(' '); // Nome abreviado do jogo
                            const chave = nomeJogo.replace(/\s+/g, '');
                            
                            if (!jogosEnviados.has(chave)) {
                                jogosEnviados.add(chave);
                                const msg = `⚽ *Oportunidade*\n` + 
                                            `⚔️ *${linhaTexto.substring(0, 40)}...*\n` + 
                                            `📊 *Soma Médias: ${mediaTotal.toFixed(1)}*`;
                                
                                bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                                console.log(`✅ ENVIADO: ${nomeJogo} | Soma: ${mediaTotal.toFixed(1)}`);
                            }
                        }
                    }
                }
            });
        });
        
        console.log(`--- BUSCA FINALIZADA. Novos jogos: ${encontrados} ---`);
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(() => { jogosEnviados.clear(); }, 3600000); // Limpa cache a cada hora
setInterval(monitorarJogos, 300000); // Busca a cada 5 min
monitorarJogos();
