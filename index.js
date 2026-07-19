const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Filtragem de Datas Ativa'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// Lista de palavras que NUNCA devem estar no nome do time
const lixo = ["julho", "agosto", "setembro", "2026", "feira", "ho", "TotalPró", "Liga", "Partida", "Amanhã", "Tomorrow"];

function limparNome(nome) {
    let n = nome.trim();
    // Remove palavras do lixo
    lixo.forEach(palavra => {
        const regex = new RegExp(palavra, "gi");
        n = n.replace(regex, "");
    });
    // Remove caracteres especiais e espaços extras
    return n.replace(/[^\wÀ-ÿ\s]/g, "").replace(/\s+/g, " ").trim();
}

let jogosEnviados = new Set();

async function monitorarJogos() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let encontrados = 0;

        // Procura em toda a página
        $('div, p, td, span').each((i, el) => {
            const texto = $(el).text().trim();
            
            // FILTRO DE SEGURANÇA: Se a linha tiver "x" MAS contiver palavras de data, ignora na hora
            const ehData = lixo.some(termo => texto.toLowerCase().includes(termo.toLowerCase()));
            if (ehData) return; // Pula esta linha

            if (texto.includes(' x ')) {
                // Regex: Procura "Nome x Nome" (ignora se começar com minúscula, evitando cabeçalhos)
                const match = texto.match(/([A-ZÀ-ÿ][A-Za-zÀ-ÿ\s]{2,})\s?x\s?([A-ZÀ-ÿ][A-Za-zÀ-ÿ\s]{2,})/i);
                
                if (match) {
                    const timeA = limparNome(match[1]);
                    const timeB = limparNome(match[2]);
                    
                    // Validação: nomes precisam ter pelo menos 3 letras e não ser lixo
                    if (timeA.length < 3 || timeB.length < 3) return;

                    const numeros = texto.match(/(\d{1,2}[.,]\d)/g);
                    if (numeros && numeros.length >= 2) {
                        const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                        const chave = (timeA + timeB).toLowerCase().replace(/[^a-z]/g, '');
                        
                        if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(chave)) {
                            jogosEnviados.add(chave);
                            encontrados++;
                            
                            const msg = `⚽ *Oportunidade de Hoje*\n` +
                                        `⚔️ *${timeA} x ${timeB}*\n` +
                                        `📊 *Média: ${media.toFixed(1)}*`;
                            
                            bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                            console.log(`✅ ENVIADO: ${timeA} x ${timeB} | Média: ${media.toFixed(1)}`);
                        }
                    }
                }
            }
        });
        console.log(`🔍 Varredura concluída. Novos jogos hoje: ${encontrados}`);
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reset cache a cada 6h, checa a cada 5 min
setInterval(() => { jogosEnviados.clear(); }, 21600000);
setInterval(monitorarJogos, 300000); 
monitorarJogos();
