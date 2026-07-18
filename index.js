const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Monitorando em Tempo Real (Sem Agendamento)'));
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
        console.log(`🔍 Iniciando varredura em tempo real...`);
        
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 20000
        });

        const $ = cheerio.load(response.data);
        
        // Se a seção "Hoje" for difícil de detectar, vamos percorrer a página de forma mais agressiva
        // Vamos buscar elementos que contenham " x " e que pareçam ser jogos
        $('tr, div').each((i, el) => {
            const rawText = $(el).text().trim().replace(/\s+/g, ' ');
            const texto = rawText.toLowerCase();

            // Lógica: Se o texto contém um confronto " x " e parece ter dados de escanteios
            if (texto.includes(' x ')) {
                const matchConfronto = rawText.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                
                if (matchConfronto) {
                    const jogoFinal = matchConfronto[0].replace(/Hoje/gi, '').trim();
                    
                    // Regex para capturar números decimais próximos um do outro (ex: 5.4 e 4.3)
                    const numeros = rawText.match(/(\d{1,2}[.,]\d)/g);
                    let media = 0;
                    
                    if (numeros && numeros.length >= 2) {
                        // Tenta somar os dois primeiros números encontrados na linha
                        media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                    }

                    // Filtro 9.5 a 15.0
                    if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(jogoFinal)) {
                        jogosEnviados.add(jogoFinal);
                        
                        bot.sendMessage(CHAT_ID, `⚽ *Oportunidade encontrada (Tempo Real)*\n\n⚔️ ${jogoFinal}\n📊 Média de escanteios FT: ${media.toFixed(1)}`, { parse_mode: 'Markdown' });
                        
                        console.log(`✅ ENVIADO: ${jogoFinal} | Média: ${media.toFixed(1)}`);
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Limpa o cache a cada 6 horas para garantir que jogos novos apareçam
setInterval(() => { jogosEnviados.clear(); }, 21600000); 

// Monitora a cada 5 minutos
setInterval(monitorarJogos, 300000); 
monitorarJogos(); // Roda imediatamente ao iniciar
