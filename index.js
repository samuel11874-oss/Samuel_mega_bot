const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Busca Tolerante'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

let jogosEnviados = new Set();

async function monitorarJogos() {
    console.log(`🔍 Iniciando Varredura Tolerante...`);
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let encontrados = 0;

        // Vamos ler cada linha da tabela de forma individual e super flexível
        $('tr').each((i, el) => {
            const linhaTexto = $(el).text().trim();
            
            // Regex ultra tolerante: procura "Nome x Nome" ignorando espaços extras
            const match = linhaTexto.match(/([A-Za-zÀ-ÿ0-9\s.-]{4,})\s*[xX]\s*([A-Za-zÀ-ÿ0-9\s.-]{4,})/);
            
            if (match) {
                const timeA = match[1].trim();
                const timeB = match[2].trim();
                const jogoCompleto = `${timeA} x ${timeB}`;
                
                // Extrai qualquer número decimal que encontrar na linha (pode ser 10.5 ou 10,5)
                const numeros = linhaTexto.match(/(\d{1,2}[.,]\d)/g);
                
                // Se encontrar pelo menos 2 números (ex: média do mandante e visitante)
                if (numeros && numeros.length >= 2) {
                    const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                    
                    // Chave para evitar duplicados
                    const chave = (timeA + timeB).toLowerCase().replace(/[^a-z]/g, '');
                    
                    if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(chave)) {
                        jogosEnviados.add(chave);
                        encontrados++;
                        
                        const msg = `⚽ *Oportunidade Encontrada*\n\n` +
                                    `⚔️ *Jogo:* ${jogoCompleto}\n` +
                                    `📊 *Média de escanteios:* ${media.toFixed(1)}`;
                        
                        bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                        console.log(`✅ ENVIADO: ${jogoCompleto} | Média: ${media.toFixed(1)}`);
                    }
                }
            }
        });
        
        console.log(`🔍 Varredura finalizada. Jogos encontrados: ${encontrados}`);
        
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reseta cache a cada 2 horas
setInterval(() => { jogosEnviados.clear(); }, 7200000);
setInterval(monitorarJogos, 300000); // 5 minutos
monitorarJogos();
