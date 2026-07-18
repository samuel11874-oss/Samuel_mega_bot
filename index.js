const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Scanner com Lista Negra'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

let jogosEnviados = new Set();

async function monitorarJogos() {
    console.log(`🔍 Iniciando Varredura (Ignorando dias futuros)...`);
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let encontrados = 0;

        // Procura por todas as linhas de tabela ou blocos de texto
        $('tr, div').each((i, el) => {
            const linhaTexto = $(el).text();
            const linhaLower = linhaTexto.toLowerCase();

            // LISTA NEGRA: Se encontrar qualquer palavra que indique outro dia, pula essa linha
            if (/(amanhã|segunda|terça|quarta|quinta|sexta|sábado|domingo|janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|2026|próxima)/.test(linhaLower)) {
                return; // Pula essa linha, não nos interessa
            }

            // Procura o padrão de jogo "Time X Time"
            const match = linhaTexto.match(/([A-Za-zÀ-ÿ\s]{4,})\sx\s([A-Za-zÀ-ÿ\s]{4,})/);
            
            if (match) {
                const jogoOriginal = match[0].trim();
                
                // Extrai números de média
                const numeros = linhaTexto.match(/(\d{1,2}[.,]\d)/g);
                
                if (numeros && numeros.length >= 2) {
                    const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                    const chaveUnica = jogoOriginal.toLowerCase().replace(/[^a-z]/g, '');
                    
                    if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(chaveUnica)) {
                        jogosEnviados.add(chaveUnica);
                        encontrados++;
                        
                        const msg = `⚽ *Oportunidade (HOJE)*\n\n` +
                                    `⚔️ *Jogo:* ${jogoOriginal}\n` +
                                    `📊 *Média de escanteios:* ${media.toFixed(1)}`;
                        
                        bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                        console.log(`✅ ENVIADO: ${jogoOriginal} | Média: ${media.toFixed(1)}`);
                    }
                }
            }
        });
        
        console.log(`🔍 Varredura concluída. Jogos filtrados encontrados: ${encontrados}`);
        
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reseta o cache a cada 6 horas
setInterval(() => { jogosEnviados.clear(); }, 21600000);
setInterval(monitorarJogos, 300000);
monitorarJogos();
