const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Jogos de Hoje ⚽</h2><p>Operando com WinDrawWin e Football-Data.co.uk (Sem API)</p>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

let jogosEnviados = new Set();

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

// 1. BUSCA DE JOGOS DE HOJE NO WINDRAWWIN
async function buscarWinDrawWin() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        let encontrados = 0;

        $('div, tr').each((i, el) => {
            const texto = $(el).text().trim();
            
            // Ignora termos que indiquem dias futuros/passados se houver
            if (/amanhã|ontem/i.test(texto)) return;

            if (texto.includes(' x ') && /\d[.,]\d/.test(texto)) {
                const linhaLimpa = texto.replace(/hoje|amanhã|tomorrow|data/gi, '').trim();
                const match = linhaLimpa.match(/([A-Za-zÀ-ÿ\s]{3,})\s?x\s?([A-Za-zÀ-ÿ\s]{3,})/i);
                
                if (match) {
                    const t1 = match[1].trim();
                    const t2 = match[2].trim();
                    const chave = `wdw_${t1}_${t2}`.toLowerCase().replace(/\s/g, '');
                    
                    if (!jogosEnviados.has(chave)) {
                        jogosEnviados.add(chave);
                        encontrados++;

                        const bandeira = getBandeira(t1);
                        const msg = `⚽ *Confronto de Hoje (WinDrawWin)*\n\n` +
                                    `${bandeira} *${t1} x ${t2}*`;
                        
                        bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                        console.log(`✅ [WinDrawWin] Enviado: ${t1} x ${t2}`);
                    }
                }
            }
        });
        console.log(`🔍 [WinDrawWin] Varredura de hoje concluída. Novos jogos: ${encontrados}`);
    } catch (e) {
        console.error("Erro no WinDrawWin:", e.message);
    }
}

// 2. BUSCA DE JOGOS DE HOJE NOS CSVs DO FOOTBALL-DATA.CO.UK
async function buscarFootballDataCSV() {
    try {
        const ligas = ['E0', 'SP1', 'I1', 'D1', 'F1'];
        const hojeObj = new Date();
        const dia = String(hojeObj.getDate()).padStart(2, '0');
        const mes = String(hojeObj.getMonth() + 1).padStart(2, '0');
        const ano = hojeObj.getFullYear().toString().slice(-2);
        const temporada = '2526';

        console.log(`📊 [Football-Data.co.uk] Buscando confrontos para hoje: ${dia}/${mes}/20${ano}`);

        for (const liga of ligas) {
            const csvUrl = `https://www.football-data.co.uk/mmz4281/${temporada}/${liga}.csv`;
            const response = await axios.get(csvUrl, { headers: HEADERS }).catch(() => null);
            if (!response || !response.data) continue;

            const linhas = response.data.split('\n');
            if (linhas.length < 2) continue;

            const cabecalho = linhas[0].split(',');
            const idxDate = cabecalho.indexOf('Date');
            const idxHome = cabecalho.indexOf('HomeTeam');
            const idxAway = cabecalho.indexOf('AwayTeam');

            if (idxDate === -1 || idxHome === -1 || idxAway === -1) continue;

            for (let i = 1; i < linhas.length; i++) {
                if (!linhas[i].trim()) continue;
                const colunas = linhas[i].split(',');
                const dataJogo = colunas[idxDate]; // Formato DD/MM/YY ou DD/MM/YYYY

                if (dataJogo && (dataJogo === `${dia}/${mes}/${ano}` || dataJogo === `${dia}/${mes}/20${ano}` || dataJogo.startsWith(`${dia}/${mes}`))) {
                    const t1 = colunas[idxHome];
                    const t2 = colunas[idxAway];
                    const chave = `csv_${t1}_${t2}`.toLowerCase().replace(/\s/g, '');

                    if (!jogosEnviados.has(chave)) {
                        jogosEnviados.add(chave);
                        const bandeira = getBandeira(t1);

                        const msg = `📊 *Confronto de Hoje (Football-Data.co.uk)*\n\n` +
                                    `${bandeira} *${t1} x ${t2}*\n` +
                                    `📅 Data: ${dataJogo}`;

                        bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                        console.log(`✅ [Football-Data CSV] Enviado: ${t1} x ${t2} (${liga})`);
                    }
                }
            }
        }
    } catch (e) {
        console.error("Erro no Football-Data CSV:", e.message);
    }
}

// Limpa cache a cada 1 hora
setInterval(() => { jogosEnviados.clear(); }, 3600000);

// Executa as varreduras a cada 5 minutos
setInterval(() => {
    buscarWinDrawWin();
    buscarFootballDataCSV();
}, 300000);

// Execução inicial imediata
buscarWinDrawWin();
buscarFootballDataCSV();
