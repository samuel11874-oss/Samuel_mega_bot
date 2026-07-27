const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot Operacional 🚀</h2><p>Monitorando WinDrawWin e Football-Data.co.uk</p>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

let jogosEnviados = new Set();

// Função para identificar a bandeira pelo nome do time
function getBandeira(teamName) {
    const list = {
        "Flamengo": "🇧🇷", "Palmeiras": "🇧🇷", "Corinthians": "🇧🇷", "São Paulo": "🇧🇷",
        "Santos": "🇧🇷", "Cruzeiro": "🇧🇷", "Atlético": "🇧🇷", "Bahia": "🇧🇷",
        "Vasco": "🇧🇷", "Botafogo": "🇧🇷", "Fluminense": "🇧🇷", "Grêmio": "🇧🇷",
        "Internacional": "🇧🇷", "Arsenal": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Chelsea": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Liverpool": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", 
        "Manchester City": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Real Madrid": "🇪🇸", "Barcelona": "🇪🇸", "Juventus": "🇮🇹"
    };
    return list[teamName] || "⚽";
}

// 1. MONITORAMENTO VIA WIN-DRAW-WIN
async function monitorarWinDrawWin() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        let encontrados = 0;

        $('div, tr').each((i, el) => {
            const texto = $(el).text().trim();
            if (texto.includes(' x ') && /\d[.,]\d/.test(texto)) {
                const linhaLimpa = texto.replace(/hoje|amanhã|tomorrow|data/gi, '').trim();
                const match = linhaLimpa.match(/([A-Za-zÀ-ÿ\s]{3,})\s?x\s?([A-Za-zÀ-ÿ\s]{3,})/i);
                const numeros = linhaLimpa.match(/(\d{1,2}[.,]\d)/g);
                
                if (match && numeros && numeros.length >= 2) {
                    const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                    
                    if (media > 9.5 && media <= 15.0) {
                        const chave = (match[1] + match[2]).toLowerCase().replace(/\s/g, '');
                        
                        if (!jogosEnviados.has(chave)) {
                            jogosEnviados.add(chave);
                            encontrados++;

                            const t1 = match[1].trim();
                            const t2 = match[2].trim();
                            const bandeira = getBandeira(t1);
                            
                            const msg = `⚽ *Oportunidade WinDrawWin*\n\n` +
                                        `${bandeira} *${t1} x ${t2}*\n` +
                                        `⛳ *Média de escanteio FT: ${media.toFixed(1)}*`;
                            
                            bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                            console.log(`✅ [WinDrawWin] Enviado: ${t1} x ${t2}`);
                        }
                    }
                }
            }
        });
        console.log(`🔍 [WinDrawWin] Verificação concluída. Novos jogos: ${encontrados}`);
    } catch (e) {
        console.error("Erro no WinDrawWin:", e.message);
    }
}

// 2. MONITORAMENTO VIA FOOTBALL-DATA.CO.UK (Com logs de diagnóstico)
async function monitorarFootballDataCSV() {
    try {
        const ligas = ['E0', 'SP1', 'I1', 'D1', 'F1'];
        const hojeObj = new Date();
        const dia = String(hojeObj.getDate()).padStart(2, '0');
        const mes = String(hojeObj.getMonth() + 1).padStart(2, '0');
        const ano = hojeObj.getFullYear().toString().slice(-2);
        const temporada = `2526`; // Temporada atual de referência nas planilhas

        console.log(`📊 [Football-Data CSV] Verificando planilhas para a data: ${dia}/${mes}/20${ano}...`);

        for (const liga of ligas) {
            const csvUrl = `https://www.football-data.co.uk/mmz4281/${temporada}/${liga}.csv`;
            
            const response = await axios.get(csvUrl, { headers: HEADERS }).catch(() => null);
            if (!response || !response.data) {
                console.log(`⚠️ [Football-Data] Não foi possível carregar o CSV da liga ${liga}`);
                continue;
            }

            const linhas = response.data.split('\n');
            if (linhas.length < 2) continue;

            const cabecalho = linhas[0].split(',');
            const idxDate = cabecalho.indexOf('Date');
            const idxHome = cabecalho.indexOf('HomeTeam');
            const idxAway = cabecalho.indexOf('AwayTeam');

            if (idxDate === -1 || idxHome === -1 || idxAway === -1) continue;

            let jogosLigaEncontrados = 0;

            for (let i = 1; i < linhas.length; i++) {
                if (!linhas[i].trim()) continue;
                const colunas = linhas[i].split(',');
                const dataJogo = colunas[idxDate]; 

                if (dataJogo && (dataJogo.startsWith(`${dia}/${mes}`) || dataJogo === `${dia}/${mes}/20${ano}`)) {
                    const t1 = colunas[idxHome];
                    const t2 = colunas[idxAway];
                    const chave = `csv_${t1}_${t2}`.toLowerCase().replace(/\s/g, '');

                    if (!jogosEnviados.has(chave)) {
                        jogosEnviados.add(chave);
                        jogosLigaEncontrados++;

                        const bandeira = getBandeira(t1);
                        const msg = `📊 *Dataset Football-Data.co.uk*\n\n` +
                                    `${bandeira} *${t1} x ${t2}*\n` +
                                    `📅 Data: ${dataJogo}`;

                        bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                        console.log(`✅ [Football-Data CSV] Jogo enviado: ${t1} x ${t2} (${liga})`);
                    }
                }
            }
            console.log(`📁 Liga ${liga}: ${jogosLigaEncontrados} jogos encontrados para hoje.`);
        }
    } catch (e) {
        console.error("Erro crítico no Football-Data CSV:", e.message);
    }
}

// Ciclos de execução
setInterval(() => { jogosEnviados.clear(); }, 3600000); 

setInterval(() => {
    monitorarWinDrawWin();
    monitorarFootballDataCSV();
}, 300000); 

monitorarWinDrawWin();
monitorarFootballDataCSV();
