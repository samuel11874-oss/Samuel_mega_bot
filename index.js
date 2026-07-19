const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Com Limpeza de Nomes'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// Lista de palavras que o robô costuma "confundir" com nomes de times
const sujos = ["Noruega", "Brasileirão", "EUA", "China", "Finlândia", "Chil", "Índia", "Suécia", "Brasil", "Hoje", "Partida", "Liga"];

function limparNome(nome) {
    let nomeLimpo = nome;
    sujos.forEach(palavra => {
        const regex = new RegExp(palavra, "gi");
        nomeLimpo = nomeLimpo.replace(regex, "");
    });
    return nomeLimpo.trim();
}

let jogosEnviados = new Set();

async function monitorarJogos() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        const fullText = $('body').text().replace(/\s+/g, ' ');
        const regexJogo = /([A-Za-zÀ-ÿ\s]{3,20})\s?x\s?([A-Za-zÀ-ÿ\s]{3,20})/gi;
        
        let match;
        let encontrados = 0;

        while ((match = regexJogo.exec(fullText)) !== null) {
            let timeA = limparNome(match[1]);
            let timeB = limparNome(match[2]);
            
            // Validação para não enviar nomes vazios ou lixo
            if (timeA.length < 3 || timeB.length < 3) continue;

            const trecho = fullText.substring(match.index, match.index + 150);
            const numeros = trecho.match(/(\d{1,2}[.,]\d)/g);
            
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
        console.log(`🔍 Varredura concluída. Novos jogos: ${encontrados}`);
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(() => { jogosEnviados.clear(); }, 7200000);
setInterval(monitorarJogos, 300000); 
monitorarJogos();
