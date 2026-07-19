const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Filtro Inteligente'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// Lista de palavras proibidas (Lixo)
const lixo = ["TotalPró", "Liga", "Partida", "Amanhã", "Tomorrow", "Estatísticas", "Escanteios", "Menu"];

function limparNome(nome) {
    let n = nome.trim();
    // Remove palavras do lixo
    lixo.forEach(palavra => {
        const regex = new RegExp(palavra, "gi");
        n = n.replace(regex, "");
    });
    // Remove caracteres especiais, espaços duplos e garante que comece com letra
    return n.replace(/[^\wÀ-ÿ\s]/g, "").replace(/\s+/g, " ").trim();
}

let jogosEnviados = new Set();

async function monitorarJogos() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let encontrados = 0;

        // Procura por qualquer elemento que tenha o padrão "Time x Time"
        // A Regex força que o nome do time comece com letra maiúscula (ex: "Coritiba", não "ima")
        const regexJogo = /([A-ZÀ-ÿ][A-Za-zÀ-ÿ\s]{2,})\s?x\s?([A-ZÀ-ÿ][A-Za-zÀ-ÿ\s]{2,})/i;

        $('tr, div, p').each((i, el) => {
            const texto = $(el).text();
            
            // Só processa se tiver " x "
            if (texto.includes(' x ')) {
                const match = texto.match(regexJogo);
                
                if (match) {
                    let timeA = limparNome(match[1]);
                    let timeB = limparNome(match[2]);
                    
                    // Validação de segurança: nomes precisam ter sentido
                    if (timeA.length < 3 || timeB.length < 3 || lixo.some(p => timeA.includes(p) || timeB.includes(p))) return;

                    const numeros = texto.match(/(\d{1,2}[.,]\d)/g);
                    if (numeros && numeros.length >= 2) {
                        const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                        const chave = (timeA + timeB).toLowerCase().replace(/[^a-z]/g, '');
                        
                        // Envia apenas se a média bater e não for duplicado
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
            }
        });
        console.log(`🔍 Varredura concluída. Novos jogos: ${encontrados}`);
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reset cache e checagem
setInterval(() => { jogosEnviados.clear(); }, 7200000);
setInterval(monitorarJogos, 300000); 
monitorarJogos();
