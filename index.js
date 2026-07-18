const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Leitura Universal Ativa'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Headers simulando um navegador real de Desktop para forçar o site a entregar a versão completa
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Referer': 'https://www.windrawwin.com/'
};

let jogosEnviados = new Set();

async function monitorarJogos() {
    try {
        console.log(`🔍 Iniciando varredura profunda...`);
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS, timeout: 25000 });

        const $ = cheerio.load(response.data);
        
        // Vamos extrair TUDO que parece texto de jogo
        // Procuramos por linhas que contenham " x "
        const bodyText = $('body').text();
        const linhas = bodyText.split('\n');

        linhas.forEach(linha => {
            const linhaLimpa = linha.trim();

            // Filtro robusto: precisa ter " x " e não ser uma data futura
            if (linhaLimpa.includes(' x ') && !linhaLimpa.toLowerCase().match(/(segunda|terça|quarta|quinta|sexta|sábado|domingo|julho|agosto|setembro|outubro)/)) {
                
                // Regex para capturar: Time x Time
                const matchConfronto = linhaLimpa.match(/([A-Za-zÀ-ÿ\s]{4,})\sx\s([A-Za-zÀ-ÿ\s]{4,})/);
                
                if (matchConfronto) {
                    const jogo = matchConfronto[0].trim();
                    
                    // Regex para encontrar números de escanteios (ex: 4.5 e 5.5)
                    const numeros = linhaLimpa.match(/(\d{1,2}[.,]\d)/g);
                    
                    if (numeros && numeros.length >= 2) {
                        const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));

                        if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(jogo)) {
                            jogosEnviados.add(jogo);
                            
                            bot.sendMessage(CHAT_ID, `⚽ *Oportunidade Encontrada*\n\n⚔️ ${jogo}\n📊 Média de escanteios FT: ${media.toFixed(1)}`, { parse_mode: 'Markdown' })
                               .catch(err => console.error("Erro Telegram:", err.message));
                            
                            console.log(`✅ ENVIADO: ${jogo} | Média: ${media.toFixed(1)}`);
                        }
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Limpeza de cache a cada 2 horas
setInterval(() => { jogosEnviados.clear(); }, 7200000); 

// Roda a cada 5 minutos
setInterval(monitorarJogos, 300000); 
monitorarJogos();
