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

// Lista de palavras que devem ser removidas do nome do jogo para ele ficar limpo
const palavrasIndesejadas = /brasileirão|estatísticas|escanteios|série|minutos|hoje|amanhã|segunda|terça|quarta|quinta|sexta|sábado|domingo|2026|liga|handicap|mais|menos|próxima|partida/gi;

async function monitorarJogos() {
    console.log(`🔍 Iniciando Varredura com Limpeza de Dados...`);
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let encontrados = 0;

        $('tr').each((i, el) => {
            const linhaTexto = $(el).text();
            
            // Procura o padrão "Time A x Time B"
            const match = linhaTexto.match(/([A-Za-zÀ-ÿ\s]{4,})\sx\s([A-Za-zÀ-ÿ\s]{4,})/i);
            
            if (match) {
                // Pega os times e já aplica a limpeza agressiva
                let timeA = match[1].replace(palavrasIndesejadas, '').trim();
                let timeB = match[2].replace(palavrasIndesejadas, '').trim();
                
                // Pega a média da linha
                const numeros = linhaTexto.match(/(\d{1,2}[.,]\d)/g);
                
                if (numeros && numeros.length >= 2) {
                    const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                    
                    // Chave baseada APENAS no nome limpo dos times
                    const chaveUnica = (timeA + timeB).toLowerCase().replace(/[^a-z]/g, '');
                    
                    if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(chaveUnica)) {
                        jogosEnviados.add(chaveUnica);
                        encontrados++;
                        
                        const msg = `⚽ *Oportunidade Encontrada*\n\n` +
                                    `⚔️ *Jogo:* ${timeA} x ${timeB}\n` +
                                    `📊 *Média de escanteios:* ${media.toFixed(1)}`;
                        
                        bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                        console.log(`✅ ENVIADO: ${timeA} x ${timeB} | Média: ${media.toFixed(1)}`);
                    }
                }
            }
        });
        
        console.log(`🔍 Varredura concluída. Jogos limpos encontrados: ${encontrados}`);
        
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reseta a lista a cada 6 horas
setInterval(() => { jogosEnviados.clear(); }, 21600000);
setInterval(monitorarJogos, 300000); // 5 minutos
monitorarJogos();
