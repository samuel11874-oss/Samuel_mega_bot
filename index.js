const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Scanner Flexível'));
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

        // Itera sobre as linhas da tabela
        $('tr').each((i, el) => {
            const linhaTexto = $(el).text().trim();
            const linhaLower = linhaTexto.toLowerCase();

            // Pula linhas que explicitamente indicam datas futuras
            if (/(amanhã|segunda|terça|quarta|quinta|sexta|sábado|domingo|2026)/.test(linhaLower)) {
                return; 
            }

            // Regex flexível: Procura "Time x Time" em qualquer parte da linha
            const match = linhaTexto.match(/([A-Za-zÀ-ÿ\s]{4,})\sx\s([A-Za-zÀ-ÿ\s]{4,})/i);
            
            if (match) {
                const timeA = match[1].trim();
                const timeB = match[2].trim();
                const jogoFormatado = `${timeA} x ${timeB}`;
                
                // Busca média (espera encontrar números como 10.5 ou 10,5)
                const numeros = linhaTexto.match(/(\d{1,2}[.,]\d)/g);
                
                if (numeros && numeros.length >= 2) {
                    const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                    
                    // Chave baseada apenas no nome dos times
                    const chaveUnica = (timeA + timeB).toLowerCase().replace(/[^a-z]/g, '');
                    
                    if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(chaveUnica)) {
                        jogosEnviados.add(chaveUnica);
                        encontrados++;
                        
                        const msg = `⚽ *Oportunidade (HOJE)*\n\n` +
                                    `⚔️ *Jogo:* ${jogoFormatado}\n` +
                                    `📊 *Média de escanteios:* ${media.toFixed(1)}`;
                        
                        bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                        console.log(`✅ ENVIADO: ${jogoFormatado} | Média: ${media.toFixed(1)}`);
                    }
                }
            }
        });
        
        console.log(`🔍 Varredura concluída. Novos jogos encontrados: ${encontrados}`);
        
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reseta a lista de controle a cada 6 horas para não acumular muito
setInterval(() => { jogosEnviados.clear(); }, 21600000);
setInterval(monitorarJogos, 300000); // 5 minutos
monitorarJogos();
