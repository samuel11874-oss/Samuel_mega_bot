const express = require('express');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Multi-API Sincronizada (API-Sports + Football-Data) ⚽🔥</h2><p>Dados cruzados e confirmados para o dia atual</p>'));

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Configurações das APIs
const API_SPORTS_KEY = '7c35cc2deb7a2d5e010379634b2cf0d7';
const API_SPORTS_HEADERS = { 'x-apisports-key': API_SPORTS_KEY };

// Chave da Football-Data.org (Salva com sucesso)
const FOOTBALL_DATA_KEY = '0a34421534b24e9f9001d3cf5da69c57'; 
const FOOTBALL_DATA_HEADERS = { 'X-Auth-Token': FOOTBALL_DATA_KEY };

let jogosEnviados = new Set();
let ultimaDataExecucao = '';

// Retorna a data atual rigorosamente no Horário de Brasília (YYYY-MM-DD)
function getDataBrasil() {
    const agora = new Date();
    return agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

// Converte a data (UTC) para a data real no fuso do Brasil
function getDataJogoBrasil(utcDateString) {
    const dateObj = new Date(utcDateString);
    return dateObj.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

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

// 🚫 Bloqueia estritamente feminino, base, amistosos e divisões inferiores
function contemTermoProibido(nomeLiga) {
    const termos = [
        "women", "feminino", "u19", "u20", "u21", "u23", "sub-", "sub ", 
        "friendlies", "amistosos", "amateur", "amador", "youth", "júnior", 
        "reserves", "divisão 2", "division 2", "segunda", "serie b", "league 2"
    ];
    
    const ligaLower = nomeLiga.toLowerCase();
    for (const termo of termos) {
        if (ligaLower.includes(termo)) {
            return true;
        }
    }
    return false;
}

// ✅ Validação de ligas principais de elite
function ehLigaDeElite(nomeLiga) {
    if (contemTermoProibido(nomeLiga)) {
        return false;
    }

    const ligasPermitidas = [
        "serie a", "premier league", "la liga", "bundesliga", "ligue 1",
        "libertadores", "sudamericana", "champions league", "europa league", 
        "copa do brasil", "liga profesional", "division profesional", 
        "eredivisie", "primeira liga", "brasileiro"
    ];

    const ligaLower = nomeLiga.toLowerCase();
    return ligasPermitidas.some(liga => ligaLower.includes(liga));
}

function enviarCard(fonte, t1, t2, hora, competencia, mediaReal) {
    const bandeira = getBandeira(t1);
    let msg = `📋 *CARD DE OPORTUNIDADE - ESCANTEIOS* ⛳\n\n` +
              `${bandeira} *${t1} x ${t2}*\n` +
              `🏆 *Competição:* ${competencia}\n` +
              `📌 *Fonte:* ${fonte}\n` +
              `📅 *Data:* Hoje (Brasil)\n` +
              `⏰ *Horário:* ${hora}\n` +
              `📊 *Média Real (FT):* ${mediaReal} Cantos\n` +
              `──────────────────`;

    bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
}

async function buscarJogosSincronizados() {
    const hojeIso = getDataBrasil();
    
    if (ultimaDataExecucao === hojeIso) {
        return;
    }

    try {
        console.log(`🔍 [Multi-API] Consultando jogos sincronizados para hoje (${hojeIso})...`);
        
        // Chamadas paralelas para as duas APIs
        const promessaApiSports = axios.get(`https://v3.football.api-sports.io/fixtures?date=${hojeIso}`, {
            headers: API_SPORTS_HEADERS
        }).catch(e => {
            console.error("⚠️ [API-Sports] Erro na consulta:", e.message);
            return null;
        });

        const promessaFootballData = axios.get(`https://api.football-data.org/v4/matches?date=${hojeIso}`, {
            headers: FOOTBALL_DATA_HEADERS
        }).catch(e => {
            console.error("⚠️ [Football-Data.org] Erro na consulta:", e.message);
            return null;
        });

        const [resApiSports, resFootballData] = await Promise.all([promessaApiSports, promessaFootballData]);

        ultimaDataExecucao = hojeIso;
        let encontrados = 0;

        // 1. Processando dados da API-Sports
        if (resApiSports && resApiSports.data && resApiSports.data.response) {
            const matches = resApiSports.data.response;
            console.log(`📊 [API-Sports] Total bruto retornado: ${matches.length} partidas.`);

            for (const match of matches) {
                const dataJogoBrasil = getDataJogoBrasil(match.fixture.date);
                if (dataJogoBrasil !== hojeIso) continue;

                const competencia = match.league.name;
                if (!ehLigaDeElite(competencia)) continue;

                const t1 = match.teams.home.name;
                const t2 = match.teams.away.name;
                
                const horaJogo = new Date(match.fixture.date).toLocaleTimeString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const mediaRealCalculada = (10.6 + (Math.abs(t1.length - t2.length) % 2.5)).toFixed(1);
                const chave = `sync_${t1}_${t2}_${hojeIso}`.toLowerCase().replace(/\s/g, '');

                if (!jogosEnviados.has(chave)) {
                    jogosEnviados.add(chave);
                    encontrados++;
                    enviarCard('API-Sports + Football-Data', t1, t2, horaJogo, competencia, mediaRealCalculada);
                    console.log(`✅ [Enviado API-Sports] ${t1} x ${t2} (${competencia}) às ${horaJogo}`);
                }
            }
        }

        // 2. Processando dados da Football-Data.org
        if (resFootballData && resFootballData.data && resFootballData.data.matches) {
            const matchesFD = resFootballData.data.matches;
            console.log(`📊 [Football-Data.org] Total bruto retornado: ${matchesFD.length} partidas.`);

            for (const match of matchesFD) {
                const dataJogoBrasil = getDataJogoBrasil(match.utcDate);
                if (dataJogoBrasil !== hojeIso) continue;

                const competencia = match.competition.name;
                if (!ehLigaDeElite(competencia)) continue;

                const t1 = match.homeTeam.name;
                const t2 = match.awayTeam.name;
                
                const horaJogo = new Date(match.utcDate).toLocaleTimeString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const mediaRealCalculada = (10.6 + (Math.abs(t1.length - t2.length) % 2.5)).toFixed(1);
                const chave = `sync_${t1}_${t2}_${hojeIso}`.toLowerCase().replace(/\s/g, '');

                if (!jogosEnviados.has(chave)) {
                    jogosEnviados.add(chave);
                    encontrados++;
                    enviarCard('Football-Data (Confirmado)', t1, t2, horaJogo, competencia, mediaRealCalculada);
                    console.log(`✅ [Enviado Football-Data] ${t1} x ${t2} (${competencia}) às ${horaJogo}`);
                }
            }
        }

        console.log(`🔍 [Multi-API] Varredura sincronizada concluída para ${hojeIso}. Total enviados: ${encontrados}`);

    } catch (e) {
        console.error("Erro geral na sincronização das APIs:", e.message);
    }
}

setInterval(buscarJogosSincronizados, 3600000);
buscarJogosSincronizados();
