const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Extração Estruturada'));
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

        // Focamos apenas nas linhas (tr) da tabela, onde os dados estão organizados
        $('tr').each((i, element) => {
            const linhaTexto = $(element).text().replace(/\s+/g, ' ').trim();
            
            // Só processa linhas que contêm " x " (indicando jogo)
            if (linhaTexto.includes(' x ')) {
                
                // Regex aprimorada:
                // 1. ([A-Za-zÀ-ÿ ]{3,20}) -> Pega o Nome do Time A
                // 2. \s*x\s* -> Separador
                // 3. ([A-Za-zÀ-ÿ ]{3,20}) -> Pega o Nome do Time B
                // 4. \s* -> Para antes de qualquer coisa estranha que venha depois (como números ou países)
                const regex = /([A-Za-zÀ-ÿ ]{3,20})\s*x\s*([A-Za-zÀ-ÿ ]{3,20})/;
                const match = linhaTexto.match(regex);
                
                if (match) {
                    const timeA = match[1].trim();
                    const timeB = match[2].trim();
                    
                    // Extração de estatística apenas desta linha específica
                    const numeros = linhaTexto.match(/(\d{1,2}[.,]\d)/g);
                    
                    if (numeros && numeros.length >= 2) {
                        const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                        const chave = (timeA + timeB).toLowerCase().replace(/[^a-z]/g, '');
                        
                        if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(chave)) {
                            jogosEnviados.add(chave);
                            encontrados++;
                            
                            const msg = `⚽ *Oportunidade*\n` +
                                        `⚔️ *${timeA} x ${timeB}*\n` +
                                        `📊 *Média: ${media.toFixed(1)}*`;
                            
                            bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                            console.log(`✅ ENVIADO: ${timeA} x ${timeB} | Média: ${media.toFixed(1)}`);
                        }
                    }
                }
            }
        });
        
        console.log(`🔍 Varredura concluída. Novos jogos encontrados: ${encontrados}`);
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(() => { jogosEnviados.clear(); }, 7200000);
setInterval(monitorarJogos, 300000); 
monitorarJogos();
