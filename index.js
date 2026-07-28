const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Scanner Ativo ⚽🔥</h2><p>WinDrawWin (Foco em Escanteios > 10.5) + APIs de Apoio</p>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const FOOTBALL_DATA_ORG_TOKEN = '0a34421534b24e9f9001d3cf5da69c57';
const API_SPORTS_TOKEN = '7c35cc2deb7a2d5e010379634b2cf0d7';

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

function normalizarNome(nome) {
    return nome.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/fc|cf|ec|ac|sad/g, '')
        .replace(/[^a-z0-9]/g, '');
}

function processarEEnviarJogo(fonte, t1, t2, hora, detalhes, competencia = '') {
    const hojeObj = new Date();
    const dataHojeStr = `${String(hojeObj.getDate()).padStart(2, '0')}/${String(hojeObj.getMonth() + 1).padStart(2, '0')}`;
    
    const chaveUnica = `${normalizarNome(t1)}_${normalizarNome(t2)}_${dataHojeStr}`;

    if (jogosEnviados.has(chaveUnica)) {
        return;
    }

    jogosEnviados.add(chaveUnica);

    const bandeira = getBandeira(t1);
    let msg = `📋 *CARD DE OPORTUNIDADE* ⚽\n\n` +
              `${bandeira} *${t1} x ${t2}*\n`;
    
    if (competencia) {
        msg += `🏆 *Competição:* ${competencia}\n`;
    }
    
    msg += `📌 *Fonte:* ${fonte}\n` +
           `📅 *Data:* Hoje\n` +
           `⏰ *Horário:* ${hora}\n` +
           `⛳ *Dados:* ${detalhes}\n` +
           `──────────────────`;

    bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
    console.log(`✅ [${fonte}] Enviado (Único): ${t1} x ${t2} às ${hora}`);
}

// 1. WIN-DRAW-WIN (Varredura Profunda de Escanteios > 10.5)
async function buscarWinDrawWin() {
    try {
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        if (!response || !response.data) return;

        const $ = cheerio.load(response.data);
        const hojeObj = new Date();
        const dataHojeStr = `${String(hojeObj.getDate()).padStart(2, '0')}/${String(hojeObj.getMonth() + 1).padStart(2, '0')}`;
        
        let dataContexto = dataHojeStr;
        let horaContexto = "A definir";

        // Varredura rigorosa em linhas de tabelas e blocos de texto
        $('tr, div.match-row, li').each((i, el) => {
            const texto = $(el).text().trim();
            
            const matchDataTexto = texto.match(/(\d{2}\/\d{2})/);
            if (matchDataTexto) dataContexto = matchDataTexto[1];

            const matchHoraTexto = texto.match(/(\d{2}:\d{2})/);
            if (matchHoraTexto) horaContexto = matchHoraTexto[1];

            // Garante que é jogo para hoje
            if (dataContexto !== dataHojeStr && !texto.toLowerCase().includes('hoje')) return;

            if (texto.includes(' x ') && /\d[.,]\d/.test(texto)) {
                const linhaLimpa = texto.replace(/hoje|amanhã|tomorrow|data/gi, '').trim();
                const match = linhaLimpa.match(/([A-Za-zÀ-ÿ\s]{3,})\s?x\s?([A-Za-zÀ-ÿ\s]{3,})/i);
                const numeros = linhaLimpa.match(/(\d{1,2}[.,]\d)/g);
                
                if (match && numeros && numeros.length >= 2) {
                    const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                    
                    // Filtro estrito: Média FT maior que 10.5
                    if (media > 10.5 && media <= 18.0) {
                        processarEEnviarJogo('WinDrawWin', match[1].trim(), match[2].trim(), horaContexto, `Média FT: ${media.toFixed(1)}`);
                    }
                }
            }
        });
        console.log("🔍 [WinDrawWin] Varredura de escanteios concluída.");
    } catch (e) {
        console.error("Erro no WinDrawWin:", e.message);
    }
}

// 2. FOOTBALL-DATA.CO.UK (CSV Histórico)
async function buscarFootballDataCSV() {
    try {
        const ligas = ['E0', 'SP1', 'I1', 'D1', 'F1'];
        const hojeObj = new Date();
        const dia = String(hojeObj.getDate()).padStart(2, '0');
        const mes = String(hojeObj.getMonth() + 1).padStart(2, '0');
        const ano = hojeObj.getFullYear().toString().slice(-2);
        const anoCompleto = hojeObj.getFullYear().toString();
        const temporada = '2627';

        for (const liga of ligas) {
            const csvUrl = `https://www.football-data.co.uk/mmz4281/${temporada}/${liga}.csv`;
            const response = await axios.get(csvUrl, { headers: HEADERS }).catch(() => null);
            if (!response || !response.data) continue;

            const linhas = response.data.split('\n');
            if (linhas.length < 2) continue;

            const cabecalho = linhas[0].split(',');
            const idxDate = cabecalho.indexOf('Date');
            const idxTime = cabecalho.indexOf('Time');
            const idxHome = cabecalho.indexOf('HomeTeam');
            const idxAway = cabecalho.indexOf('AwayTeam');
            const idxHC = cabecalho.indexOf('HC');
            const idxAC = cabecalho.indexOf('AC');

            if (idxDate === -1 || idxHome === -1 || idxAway === -1) continue;

            for (let i = 1; i < linhas.length; i++) {
                if (!linhas[i].trim()) continue;
                const colunas = linhas[i].split(',');
                const dataJogo = colunas[idxDate]; 
                const horaJogo = idxTime !== -1 && colunas[idxTime] ? colunas[idxTime] : 'A definir';

                const ehHoje = dataJogo && (
                    dataJogo === `${dia}/${mes}/${ano}` || 
                    dataJogo === `${dia}/${mes}/${anoCompleto}` || 
                    dataJogo === `${dia}/${mes}`
                );

                if (ehHoje) {
                    const t1 = colunas[idxHome];
                    const t2 = colunas[idxAway];
                    
                    let mediaCSV = 0;
                    if (idxHC !== -1 && idxAC !== -1 && colunas[idxHC] && colunas[idxAC]) {
                        mediaCSV = (parseFloat(colunas[idxHC]) || 0) + (parseFloat(colunas[idxAC]) || 0);
                    }

                    if (mediaCSV > 10.5) {
                        processarEEnviarJogo('Football-Data CSV', t1, t2, horaJogo, `Escanteios Registrados: ${mediaCSV}`);
                    }
                }
            }
        }
    } catch (e) {
        console.error("Erro no Football-Data CSV:", e.message);
    }
}

// 3. FOOTBALL-DATA.ORG API
async function buscarFootballDataOrgApi() {
    try {
        const hojeIso = new Date().toISOString().split('T')[0];
        const response = await axios.get(`https://api.football-data.org/v4/matches?date=${hojeIso}`, {
            headers: { 'X-Auth-Token': FOOTBALL_DATA_ORG_TOKEN }
        });

        if (!response.data || !response.data.matches) return;
        const matches = response.data.matches;

        for (const match of matches) {
            const t1 = match.homeTeam.name;
            const t2 = match.awayTeam.name;
            const competencia = match.competition.name;
            
            const horaJogo = new Date(match.utcDate).toLocaleTimeString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                hour: '2-digit',
                minute: '2-digit'
            });

            processarEEnviarJogo('Football-Data.org API', t1, t2, horaJogo, `Partida Oficial Agendada`, competencia);
        }
    } catch (e) {
        console.error("Erro na API Football-Data.org:", e.message);
    }
}

// 4. API-SPORTS
async function buscarApiSports() {
    try {
        const hojeIso = new Date().toISOString().split('T')[0];
        const response = await axios.get(`https://v3.football.api-sports.io/fixtures?date=${hojeIso}`, {
            headers: { 'x-apisports-key': API_SPORTS_TOKEN }
        });

        if (!response.data || !response.data.response) return;
        const fixtures = response.data.response;

        for (const item of fixtures) {
            const t1 = item.teams.home.name;
            const t2 = item.teams.away.name;
            const competencia = item.league.name;
            
            const horaJogo = new Date(item.fixture.date).toLocaleTimeString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                hour: '2-digit',
                minute: '2-digit'
            });

            processarEEnviarJogo('API-Sports', t1, t2, horaJogo, `Partida Oficial Ao Vivo / Hoje`, competencia);
        }
    } catch (e) {
        console.error("Erro na API-Sports:", e.message);
    }
}

// Executa as varreduras a cada 5 minutos
setInterval(() => {
    buscarWinDrawWin();
    buscarFootballDataCSV();
    buscarFootballDataOrgApi();
    buscarApiSports();
}, 300000);

// Execução inicial imediata ao ligar o bot
buscarWinDrawWin();
buscarFootballDataCSV();
buscarFootballDataOrgApi();
buscarApiSports();
