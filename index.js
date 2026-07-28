const express = require('express');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - CSV Completo + APIs Ativo ⚽🔥</h2><p>Extração total de estatísticas do Football-Data CSV (Escanteios, Chutes e Cartões).</p>'));
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
    let msg = `📋 *CARD DE OPORTUNIDADE (Média > 10.5 FT)* ⚽\n\n` +
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
    console.log(`✅ [${fonte}] Enviado: ${t1} x ${t2} às ${hora} (${detalhes})`);
}

// 1. FOOTBALL-DATA.CO.UK (CSV - Extração Completa de Estatísticas)
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
            
            // Índices de estatísticas completas do CSV
            const idxHC = cabecalho.indexOf('HC'); // Home Corners
            const idxAC = cabecalho.indexOf('AC'); // Away Corners
            const idxHS = cabecalho.indexOf('HS'); // Home Shots
            const idxAS = cabecalho.indexOf('AS'); // Away Shots
            const idxHST = cabecalho.indexOf('HST'); // Home Shots on Target
            const idxAST = cabecalho.indexOf('AST'); // Away Shots on Target
            const idxHY = cabecalho.indexOf('HY'); // Home Yellow Cards
            const idxAY = cabecalho.indexOf('AY'); // Away Yellow Cards

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
                    
                    let mediaEscanteios = 0;
                    if (idxHC !== -1 && idxAC !== -1 && colunas[idxHC] && colunas[idxAC]) {
                        mediaEscanteios = (parseFloat(colunas[idxHC]) || 0) + (parseFloat(colunas[idxAC]) || 0);
                    }

                    // Se atingir o critério de escanteios > 10.5, montamos um resumo rico com todos os dados do CSV
                    if (mediaEscanteios > 10.5) {
                        let resumoDetalhes = `Média Cantos: ${mediaEscanteios.toFixed(1)}`;
                        
                        if (idxHS !== -1 && idxAS !== -1 && colunas[idxHS] && colunas[idxAS]) {
                            resumoDetalhes += ` | Chutes: ${colunas[idxHS]}x${colunas[idxAS]}`;
                        }
                        if (idxHST !== -1 && idxAST !== -1 && colunas[idxHST] && colunas[idxAST]) {
                            resumoDetalhes += ` | No Alvo: ${colunas[idxHST]}x${colunas[idxAST]}`;
                        }
                        if (idxHY !== -1 && idxAY !== -1 && colunas[idxHY] && colunas[idxAY]) {
                            resumoDetalhes += ` | Amarelos: ${colunas[idxHY]}x${colunas[idxAY]}`;
                        }

                        processarEEnviarJogo('Football-Data CSV (Completo)', t1, t2, horaJogo, resumoDetalhes);
                    }
                }
            }
        }
        console.log("🔍 [Football-Data CSV] Varredura completa concluída.");
    } catch (e) {
        console.error("Erro no Football-Data CSV:", e.message);
    }
}

// 2. FOOTBALL-DATA.ORG API
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
        console.log("🔍 [Football-Data.org] Verificação concluída.");
    } catch (e) {
        console.error("Erro na API Football-Data.org:", e.message);
    }
}

// 3. API-SPORTS COM FILTRO DE ESCANTEIOS > 10.5 FT
async function buscarApiSportsComFiltroEscanteios() {
    try {
        const hojeIso = new Date().toISOString().split('T')[0];
        const response = await axios.get(`https://v3.football.api-sports.io/fixtures?date=${hojeIso}`, {
            headers: { 'x-apisports-key': API_SPORTS_TOKEN }
        });

        if (!response.data || !response.data.response) return;
        const fixtures = response.data.response;

        let requisicoesFeitas = 0;
        const limiteRequisicoes = 30;

        for (const item of fixtures) {
            if (requisicoesFeitas >= limiteRequisicoes) break;

            const fixtureId = item.fixture.id;
            const t1 = item.teams.home.name;
            const t2 = item.teams.away.name;
            const competencia = item.league.name;
            
            const horaJogo = new Date(item.fixture.date).toLocaleTimeString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                hour: '2-digit',
                minute: '2-digit'
            });

            try {
                const predResponse = await axios.get(`https://v3.football.api-sports.io/predictions?fixture=${fixtureId}`, {
                    headers: { 'x-apisports-key': API_SPORTS_TOKEN }
                });
                requisicoesFeitas++;

                if (predResponse.data && predResponse.data.response && predResponse.data.response.length > 0) {
                    const pred = predResponse.data.response[0];
                    
                    let mediaEscanteios = 0;
                    const comparisons = pred.comparisons;
                    
                    if (comparisons && comparisons.corners) {
                        const homeCorner = parseFloat(comparisons.corners.home) || 0;
                        const awayCorner = parseFloat(comparisons.corners.away) || 0;
                        mediaEscanteios = homeCorner + awayCorner; 
                    }

                    const homeTeamStats = pred.teams?.home?.league?.stats?.corners || 0;
                    const awayTeamStats = pred.teams?.away?.league?.stats?.corners || 0;
                    const mediaFinal = mediaEscanteios > 0 ? mediaEscanteios : (homeTeamStats + awayTeamStats);

                    if (mediaFinal > 10.5) {
                        processarEEnviarJogo('API-Sports (Previsões)', t1, t2, horaJogo, `Média FT: ${mediaFinal.toFixed(1)}`, competencia);
                    }
                }
            } catch (err) {
                // Ignora partidas sem previsões cadastradas
            }
        }
        console.log(`🔍 [API-Sports] Varredura concluída. Requisições usadas: ${requisicoesFeitas}`);
    } catch (e) {
        console.error("Erro na API-Sports:", e.message);
    }
}

// Executa as varreduras a cada 30 minutos
setInterval(() => {
    buscarFootballDataCSV();
    buscarFootballDataOrgApi();
    buscarApiSportsComFiltroEscanteios();
}, 1800000);

// Execução inicial imediata ao ligar o bot
buscarFootballDataCSV();
buscarFootballDataOrgApi();
buscarApiSportsComFiltroEscanteios();
