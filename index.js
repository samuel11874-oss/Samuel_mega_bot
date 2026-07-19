const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Busca Estável'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

let jogosEnviados = new Set();

function limparNome(nome) {
    // Remove a palavra "Hoje" caso ela tenha sido capturada no nome
    return nome.replace(/Hoje/gi, "").trim();
}

async function monitorarJogos() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let encontrados = 0;

        // Itera sobre as linhas da tabela
        $('tr').each((i, el) => {
            const texto = $(el).text();
            
            // Regex que captura "Time x Time"
            // \s+ garante que haja espaço entre os nomes e o "x"
            const match = texto.match(/([A-ZÀ-ÿ][A-Za-zÀ-ÿ\s]{2,})\s+x\s+([A-ZÀ-ÿ][A-Za-zÀ-ÿ\s]{2,})/i);
            
            if (match) {
                const timeA = limparNome(match[1]);
                const timeB = limparNome(match[2]);
                
                // Busca os números na mesma linha
                const numeros = texto.match(/(\d{1,2}[.,]\d)/g);
                
                if (numeros && numeros.length >= 2) {
                    const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                    const chave = (timeA + timeB).toLowerCase().replace(/[^a-z]/g, '');
                    
                    // Filtro de Média e evita duplicados
                    if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(chave)) {
                        jogosEnviados.add(chave);
                        encontrados++;
                        
                        const msg = `⚽ *Oportunidade de Hoje*\n` +
                                    `⚔️ *${timeA} x ${timeB}*\n` +
                                    `📊 *Média: ${media.toFixed(1)}*`;
                        
                        bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                        console.log(`✅ ENVIADO: ${timeA} x ${timeB} | Média: ${media.toFixed(1)}`);
                    }
                }
            }
        });
        
        console.log(`🔍 Varredura concluída. Novos jogos hoje: ${encontrados}`);
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reset cache a cada 6h, checa a cada 5 min
setInterval(() => { jogosEnviados.clear(); }, 21600000);
setInterval(monitorarJogos, 300000); 
monitorarJogos();
