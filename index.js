const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Limpeza Total'));
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
        
        // 1. Pega todo o texto e já limpa as palavras de lixo de uma vez
        let texto = $('body').text();
        const lixo = /Brasileirão|Série|ESTATÍSTICAS|DE|ESCANTEIOS|Liga|Handicap|Mais|Menos|Partida|Hoje|Amanhã|Copa|Profissional|S|B|A|Tabela|Resultados/gi;
        texto = texto.replace(lixo, ' '); 
        texto = texto.replace(/\s+/g, ' '); // Remove espaços duplos criados pela limpeza

        // 2. Procura pelo padrão "Time A x Time B"
        // A regex agora permite que o nome tenha mais de 3 caracteres e termina antes de números
        const regexJogo = /([A-ZÀ-Ÿ][A-Za-zÀ-ÿ ]{3,})\s*[xX]\s*([A-ZÀ-Ÿ][A-Za-zÀ-ÿ ]{3,})/g;
        
        let match;
        let encontrados = 0;

        while ((match = regexJogo.exec(texto)) !== null) {
            const timeA = match[1].trim();
            const timeB = match[2].trim();
            
            // Verifica se os nomes são curtos e lógicos (evita lixo que sobrou)
            if (timeA.length > 20 || timeB.length > 20) continue;

            // Pega o trecho logo após o jogo para achar a média (os números estão lá)
            const contexto = texto.substring(match.index, match.index + 100);
            const numeros = contexto.match(/(\d{1,2}[.,]\d)/g);
            
            if (numeros && numeros.length >= 2) {
                const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                const chave = (timeA + timeB).toLowerCase().replace(/[^a-z]/g, '');
                
                if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(chave)) {
                    jogosEnviados.add(chave);
                    encontrados++;
                    
                    const msg = `⚽ *Oportunidade*\n` +
                                `⚔️ *${timeA} x ${timeB}*\n` +
                                `📊 *Média: ${media.toFixed(1)}*`;
                    
                    bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                    console.log(`✅ ENVIADO: ${timeA} x ${timeB} | Média: ${media.toFixed(1)}`);
                }
            }
        }
        console.log(`🔍 Varredura concluída. Novos jogos encontrados: ${encontrados}`);
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reseta cache a cada 2 horas
setInterval(() => { jogosEnviados.clear(); }, 7200000);
setInterval(monitorarJogos, 300000); // 5 minutos
monitorarJogos();
