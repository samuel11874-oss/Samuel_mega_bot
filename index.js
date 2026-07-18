const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Alta Captura'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

let jogosEnviados = new Set();

async function monitorarJogos() {
    console.log(`🔍 Iniciando Varredura...`);
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let encontrados = 0;

        // Itera sobre todas as linhas da tabela
        $('tr').each((i, el) => {
            const linhaTexto = $(el).text();
            
            // Regex para capturar os times. Ele ignora o que vem depois do "X" (como nomes de ligas)
            const match = linhaTexto.match(/([A-Za-zÀ-ÿ\s]{4,})\s[xX]\s([A-Za-zÀ-ÿ\s]{4,})/);
            
            if (match) {
                const timeA = match[1].trim();
                const timeB = match[2].trim();
                
                // Extrai todos os números da linha (medias)
                const numeros = linhaTexto.match(/(\d{1,2}[.,]\d)/g);
                
                if (numeros && numeros.length >= 2) {
                    const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                    
                    // Chave única LIMPA (apenas nomes dos times)
                    const chave = (timeA + timeB).toLowerCase().replace(/[^a-z]/g, '');
                    
                    if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(chave)) {
                        jogosEnviados.add(chave);
                        encontrados++;
                        
                        const msg = `⚽ *Oportunidade Encontrada*\n\n` +
                                    `⚔️ *Jogo:* ${timeA} x ${timeB}\n` +
                                    `📊 *Média:* ${media.toFixed(1)}`;
                        
                        bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                        console.log(`✅ ENVIADO: ${timeA} x ${timeB} | Média: ${media.toFixed(1)}`);
                    }
                }
            }
        });
        
        console.log(`🔍 Varredura concluída. Total de novos jogos encontrados: ${encontrados}`);
        
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reseta o cache de jogos a cada 2 horas para garantir que você veja os jogos ao longo do dia
setInterval(() => { jogosEnviados.clear(); }, 7200000); 
setInterval(monitorarJogos, 300000);
monitorarJogos();
