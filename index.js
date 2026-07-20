const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Listagem Total Ativa'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Identidade iPhone para evitar bloqueios
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.windrawwin.com/'
};

let jogosEnviados = new Set();

function getBandeira(teamName) {
    const list = {
        "Flamengo": "🇧🇷", "Palmeiras": "🇧🇷", "Corinthians": "🇧🇷", "São Paulo": "🇧🇷",
        "Santos": "🇧🇷", "Cruzeiro": "🇧🇷", "Atlético": "🇧🇷", "Bahia": "🇧🇷",
        "Vasco": "🇧🇷", "Botafogo": "🇧🇷", "Fluminense": "🇧🇷", "Grêmio": "🇧🇷",
        "Internacional": "🇧🇷", "Ceará": "🇧🇷", "CRB": "🇧🇷", "Náutico": "🇧🇷",
        "Londrina": "🇧🇷", "Coritiba": "🇧🇷", "Operário": "🇧🇷", "Avaí": "🇧🇷",
        "América": "🇧🇷", "Juventude": "🇧🇷", "Criciúma": "🇧🇷", "São Bernardo": "🇧🇷",
        "Athletic": "🇧🇷", "Malmo": "🇸🇪", "Kalmar": "🇸🇪", "Hacken": "🇸🇪", "AIK": "🇸🇪",
        "Lahti": "🇫🇮", "Mariehamn": "🇫🇮", "KuPS": "🇫🇮", "VPS": "🇫🇮", "Gnistan": "🇫🇮"
    };
    return list[teamName] || "🏳️";
}

async function monitorarJogos() {
    try {
        console.log("Iniciando varredura...");
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let contadorJogos = 0;

        // Varre todas as linhas de tabela (tr) que contêm o formato de jogo
        $('tr').each((i, el) => {
            const texto = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Filtro: Precisa ter " x " e não pode ser parte do menu
            if (texto.includes(' x ') && texto.length < 80 && !texto.toLowerCase().includes('próxima')) {
                
                const match = texto.match(/([A-Za-zÀ-ÿ\s]{3,})\s?x\s?([A-Za-zÀ-ÿ\s]{3,})/i);
                
                if (match) {
                    const t1 = match[1].trim();
                    const t2 = match[2].trim();
                    const chave = (t1 + t2).toLowerCase().replace(/\s/g, '');
                    
                    // Verifica se já enviamos hoje (Cache de 24h)
                    if (!jogosEnviados.has(chave)) {
                        jogosEnviados.add(chave);
                        contadorJogos++;

                        const bandeira = getBandeira(t1);
                        
                        const msg = `⚽ *Oportunidade Encontrada*\n\n` +
                                    `${bandeira} *${t1} x ${t2}*\n` +
                                    `⛳ *Verificar dados no SokkerPro*`;
                        
                        bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                        console.log(`✅ ENVIADO: ${t1} x ${t2}`);
                    }
                }
            }
        });
        
        console.log(`Varredura finalizada. Novos jogos encontrados: ${contadorJogos}`);
        
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Limpa o cache apenas uma vez por dia (24h) para evitar repetições
setInterval(() => { jogosEnviados.clear(); }, 86400000); 

// Roda a verificação a cada 5 minutos
setInterval(monitorarJogos, 300000); 

// Executa na hora que o bot liga
monitorarJogos();
