const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Filtro Estrito'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

let jogosEnviados = new Set();

// Limpeza agressiva: remove tudo que não for nome de time
function limparNome(nome) {
    return nome.replace(/Brasileirão|Série|ESTATÍSTICAS|DE|ESCANTEIOS|Liga|Handicap|Mais|Menos|Partida|Hoje|Amanhã/gi, '')
               .replace(/\s+/g, ' ')
               .trim();
}

async function monitorarJogos() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        // Pega cada bloco de texto e processa individualmente para não misturar linhas
        const linhas = $('body').text().split('\n');
        let encontrados = 0;

        for (let linha of linhas) {
            // Regex restrita: [A-Za-zÀ-ÿ ] significa que NÃO permite quebras de linha no nome
            // Ela só captura o jogo se encontrar o padrão exato em uma ÚNICA linha
            const match = linha.match(/([A-ZÀ-Ÿ][A-Za-zÀ-ÿ ]{3,})\s*[xX]\s*([A-ZÀ-Ÿ][A-Za-zÀ-ÿ ]{3,})/);
            
            if (match) {
                let timeA = limparNome(match[1]);
                let timeB = limparNome(match[2]);
                
                // Validação: nomes muito longos ou estranhos são descartados
                if (timeA.length > 25 || timeB.length > 25) continue;
                
                // Extrai números apenas desta linha
                const numeros = linha.match(/(\d{1,2}[.,]\d)/g);
                
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
        }
        console.log(`🔍 Varredura concluída. Novos jogos encontrados: ${encontrados}`);
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reseta o cache de duplicados a cada 2 horas
setInterval(() => { jogosEnviados.clear(); }, 7200000);
setInterval(monitorarJogos, 300000); // 5 minutos
monitorarJogos();
