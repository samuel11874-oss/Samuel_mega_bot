const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Filtragem Estrita'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

let jogosEnviados = new Set();

async function monitorarJogos() {
    console.log(`🔍 Varredura iniciada...`);
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let encontrados = 0;

        // Focamos em linhas de tabela (tr) que geralmente contêm os jogos
        $('tr').each((i, el) => {
            const linhaTexto = $(el).text().trim();
            const linhaLower = linhaTexto.toLowerCase();

            // LISTA NEGRA: Pula linhas com datas futuras
            if (/(amanhã|segunda|terça|quarta|quinta|sexta|sábado|domingo|2026)/.test(linhaLower)) {
                return; 
            }

            // Regex focado: Procura "Time x Time" apenas no início da linha
            const match = linhaTexto.match(/^([A-Za-zÀ-ÿ\s]{4,})\sx\s([A-Za-zÀ-ÿ\s]{4,})/i);
            
            if (match) {
                const timeA = match[1].trim();
                const timeB = match[2].trim();
                const jogoFormatado = `${timeA} x ${timeB}`;
                
                // Extrai a média dos números contidos na linha
                const numeros = linhaTexto.match(/(\d{1,2}[.,]\d)/g);
                
                if (numeros && numeros.length >= 2) {
                    const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                    
                    // Chave criada APENAS com os nomes dos times (limpa)
                    const chaveUnica = (timeA + timeB).toLowerCase().replace(/[^a-z]/g, '');
                    
                    if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(chaveUnica)) {
                        jogosEnviados.add(chaveUnica);
                        encontrados++;
                        
                        const msg = `⚽ *Oportunidade (HOJE)*\n\n` +
                                    `⚔️ *Jogo:* ${jogoFormatado}\n` +
                                    `📊 *Média de escanteios:* ${media.toFixed(1)}`;
                        
                        bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                        console.log(`✅ ENVIADO: ${jogoFormatado} | Chave: ${chaveUnica} | Média: ${media.toFixed(1)}`);
                    }
                }
            }
        });
        
        console.log(`🔍 Varredura concluída. Novos jogos filtrados encontrados: ${encontrados}`);
        
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(() => { jogosEnviados.clear(); }, 43200000);
setInterval(monitorarJogos, 300000);
monitorarJogos();
