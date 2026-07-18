const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Limpeza Ativa'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

let jogosEnviados = new Set();

// Função para limpar o lixo do nome dos times
function limparNome(texto) {
    // Remove números iniciais, frases como "Começa em X minutos", "Hoje"
    return texto.replace(/^[0-9]+|Começa em \d+ minutos|Hoje/gi, '').trim();
}

async function monitorarJogos() {
    console.log(`🔍 Iniciando varredura e limpeza...`);
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        let encontrados = 0;

        $('div, span, p, tr, td').each((i, el) => {
            const texto = $(el).text().trim();
            
            // Busca padrão de jogo
            if (texto.includes(' x ') && !texto.toLowerCase().match(/(segunda|terça|quarta|quinta|sexta|sábado|domingo|janeiro|fevereiro|março)/)) {
                
                const matchConfronto = texto.match(/([A-Za-zÀ-ÿ0-9\s]{4,})\sx\s([A-Za-zÀ-ÿ0-9\s]{4,})/);
                
                if (matchConfronto) {
                    const jogoOriginal = matchConfronto[0].trim();
                    const jogoLimpo = limparNome(jogoOriginal);
                    const numeros = texto.match(/(\d{1,2}[.,]\d)/g);
                    
                    if (numeros && numeros.length >= 2) {
                        const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                        
                        // Filtro e controle de duplicidade
                        if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(jogoLimpo)) {
                            jogosEnviados.add(jogoLimpo);
                            encontrados++;
                            
                            // Card organizado
                            const mensagem = `⚽ *Oportunidade Encontrada*\n\n` +
                                             `⚔️ *Jogo:* ${jogoLimpo}\n` +
                                             `📊 *Média de escanteios FT:* ${media.toFixed(1)}`;
                            
                            bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' })
                               .catch(e => {}); 
                            
                            console.log(`✅ ENVIADO: ${jogoLimpo} | Média: ${media.toFixed(1)}`);
                        }
                    }
                }
            }
        });
        
        console.log(`🔍 Varredura concluída. Novos jogos encontrados: ${encontrados}`);
        
    } catch (e) {
        console.error("Erro crítico:", e.message);
    }
}

// Reseta cache a cada 2 horas
setInterval(() => { jogosEnviados.clear(); }, 7200000);
setInterval(monitorarJogos, 300000);
monitorarJogos();
