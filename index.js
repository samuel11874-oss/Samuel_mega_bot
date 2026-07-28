const express = require('express');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Filtro de Escanteios > 10.5 FT ⚽🔥</h2><p>WinDrawWin removido. Foco exclusivo em API-Sports e Football-Data.</p>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const FOOTBALL_DATA_ORG_TOKEN = '0a34421534b24e9f9001d3cf5da69c57';
const API_SPORTS_TOKEN = '7c35cc2deb7a2d5e010379634b2cf0d7';

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

// 1. FOOTBALL-DATA.ORG API
async function buscarFootballDataOrgApi() {
    try {
        const hojeIso = new Date().toISOString().split('T')[0];
        const response = await axios.get(`https://api.football-data.org/v4/matches?date=${hojeIso}`, {
            headers: { 'X-Auth-Token': FOOTBALL_DATA_ORG_TOKEN }
        });

        if (!response.data || !response.data.matches) return;
        console.log("🔍 [Football-Data.org] Verificação de agenda concluída.");
    } catch (e) {
        console.error("Erro na API Football-Data.org:", e.message);
    }
}

// 2. API-SPORTS COM FILTRO DE ESCANTEIOS > 10.5 FT
async function buscarApiSportsComFiltroEscanteios() {
    try {
        const hojeIso = new Date().toISOString().split('T')[0];
        const response = await axios.get(`https://v3.football.api-sports.io/fixtures?date=${hojeIso}`, {
            headers: { 'x-apisports-key': API_SPORTS_TOKEN }
        });

        if (!response.data || !response.data.response) return;
        const fixtures = response.data.response;

        let requisicoesFeitas = 0;
        const limiteRequisicoes = 30; // Protege o limite de 100 requisições diárias do plano gratuito

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

                    // Filtro estrito exigido: Apenas médias superiores a 10.5 FT
                    if (mediaFinal > 10.5) {
                        processarEEnviarJogo('API-Sports (Previsões)', t1, t2, horaJogo, `Média FT: ${mediaFinal.toFixed(1)}`, competencia);
                    }
                }
            } catch (err) {
                // Ignora erros individuais de partidas sem previsões cadastradas
            }
        }
        console.log(`🔍 [API-Sports] Varredura com filtro > 10.5 FT concluída. Requisições usadas: ${requisicoesFeitas}`);
    } catch (e) {
        console.error("Erro na API-Sports:", e.message);
    }
}

// Executa as varreduras a cada 30 minutos
setInterval(() => {
    buscarFootballDataOrgApi();
    buscarApiSportsComFiltroEscanteios();
}, 1800000);

// Execução inicial imediata ao ligar o bot
buscarFootballDataOrgApi();
buscarApiSportsComFiltroEscanteios();
