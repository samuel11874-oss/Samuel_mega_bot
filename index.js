const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Versão Limpa'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

let jogosEnviados = new Set();

// Função para limpar sujeira dos nomes
function limparNome(texto) {
    return texto.replace(/Brasileirão|Série|ESTATÍSTICAS|DE|ESCANTEIOS|Liga|Handicap|Mais|Menos|Partida|Hoje|Amanhã/gi, '')
                .replace(/\s+/g, ' ') // Remove espaços duplicados
                .trim();
}

async function monitorarJogos() {
    console.log(`🔍 Iniciando Varredura Limpa...`);
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        const textoCompleto = $('body').text();
        
        // Regex mais inteligente: Exige que o nome comece com letra maiúscula
        const regexJogo = /([A-ZÀ-Ÿ][A-Za-zÀ-ÿ\s]{3,})\s*[xX]\s*([A-ZÀ-Ÿ][A-Za-zÀ-ÿ\s]{3,})/g;
        
        let match;
        let encontrados = 0;

        while ((match = regexJogo.exec(textoCompleto)) !== null) {
            let timeA = limparNome(match[1]);
            let timeB = limparNome(match[2]);
            
            // Pega o trecho para ler a média
            const trecho = textoCompleto.substring(match.index, match.index + 200);
            const numeros = trecho.match(/(\d{1,2}[.,]\d)/g);
            
            if (numeros && numeros.length >= 2) {
                const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
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
        
        console.log(`🔍 Varredura concluída. Novos jogos encontrados: ${encontrados}`);
        
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reseta o cache a cada 2 horas
setInterval(() => { jogosEnviados.clear(); }, 7200000);
setInterval(monitorarJogos, 300000); // 5 minutos
monitorarJogos();
