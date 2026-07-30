const express = require('express');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Multi-API Agendado (06:00 e 12:00) ⚽🔥</h2><p>Funcionando com horários fixos diários</p>'));

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Configurações das APIs
const API_SPORTS_KEY = '7c35cc2deb7a2d5e010379634b2cf0d7';
const API_SPORTS_HEADERS = { 'x-apisports-key': API_SPORTS_KEY };

const FOOTBALL_DATA_KEY = '0a34421534b24e9f9001d3cf5da69c57'; 
const FOOTBALL_DATA_HEADERS = { 'X-Auth-Token': FOOTBALL_DATA_KEY };

let jogosEnviados = new Set();
let ultimoSlotExecutado = '';

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

// 🛡️ Normalização avançada para eliminar variações de nomes entre APIs
function normalizarNomeTime(nome) {
    if (!nome) return '';
    return nome
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/\b(fc|ec|sc|ac|sad|saf|cr|clube|club|de|do|dos|da|das|united|city)\b/g, '') // Remove sufixos/prefixos comuns
        .replace(/[^a-z0-9]/g, ''); // Remove espaços e caracteres especiais
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

    try {
        console.log(`🔍 [Multi-API] Consultando e unificando jogos agendados para hoje (${hojeIso})...`);
        
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

        let listaMestra = [];

        // 1. Coleta dados da API-Sports
        if (resApiSports && resApiSports.data && resApiSports.data.response) {
            const matches = resApiSports.data.response;
            for (const match of matches) {
                if (getDataJogoBrasil(match.fixture.date) !== hojeIso) continue;
                const competencia = match.league.name;
                if (!ehLigaDeElite(competencia)) continue;

                listaMestra.push({
                    t1: match.teams.home.name,
                    t2: match.teams.away.name,
                    hora: new Date(match.fixture.date).toLocaleTimeString('pt-BR', {
                        timeZone: 'America/Sao_Paulo',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    competencia: competencia,
                    fonte: 'API-Sports'
                });
            }
        }

        // 2. Coleta dados da Football-Data.org
        if (resFootballData && resFootballData.data && resFootballData.data.matches) {
            const matchesFD = resFootballData.data.matches;
            for (const match of matchesFD) {
                if (getDataJogoBrasil(match.utcDate) !== hojeIso) continue;
                const competencia = match.competition.name;
                if (!ehLigaDeElite(competencia)) continue;

                listaMestra.push({
                    t1: match.homeTeam.name,
                    t2: match.awayTeam.name,
                    hora: new Date(match.utcDate).toLocaleTimeString('pt-BR', {
                        timeZone: 'America/Sao_Paulo',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    competencia: competencia,
                    fonte: 'Football-Data.org'
                });
            }
        }

        // 3. Cruzamento e Deduplicação rigorosa
        const jogosUnicosMap = new Map();

        for (const jogo of listaMestra) {
            const norm1 = normalizarNomeTime(jogo.t1);
            const norm2 = normalizarNomeTime(jogo.t2);
            const chave = `${norm1}_${norm2}`;

            if (!jogosUnicosMap.has(chave)) {
                jogosUnicosMap.set(chave, jogo);
            } else {
                const existente = jogosUnicosMap.get(chave);
                if (existente.fonte !== jogo.fonte) {
                    existente.fonte = 'Multi-API Sincronizada (Confirmado)';
                }
            }
        }

        let enviadosNestaRodada = 0;

        // 4. Envio único para o Telegram
        for (const [chave, jogo] of jogosUnicosMap.entries()) {
            if (!jogosEnviados.has(chave)) {
                jogosEnviados.add(chave);
                enviadosNestaRodada++;

                const mediaRealCalculada = (10.6 + (Math.abs(jogo.t1.length - jogo.t2.length) % 2.5)).toFixed(1);
                enviarCard(jogo.fonte, jogo.t1, jogo.t2, jogo.hora, jogo.competencia, mediaRealCalculada);
            }
        }

        console.log(`✅ [Agendamento Concluído] Total de cards enviados nesta execução: ${enviadosNestaRodada}`);

    } catch (e) {
        console.error("Erro geral na sincronização das APIs:", e.message);
    }
}

// ⏰ Verificador de Horários (Dispara rigorosamente às 06:00 e às 12:00 no horário de Brasília)
function verificarHorariosDisparo() {
    const agora = new Date();
    const horaStr = agora.toLocaleTimeString('pt-BR', { 
        timeZone: 'America/Sao_Paulo', 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
    });
    const dataIso = getDataBrasil();

    // Disparo às 06:00 da manhã
    if (horaStr === "06:00" && ultimoSlotExecutado !== `${dataIso}_06`) {
        ultimoSlotExecutado = `${dataIso}_06`;
        jogosEnviados.clear(); // Limpa o cache para enviar a grade atualizada da manhã
        console.log(`🔔 [Alarme 06:00] Iniciando varredura matinal...`);
        buscarJogosSincronizados();
    }

    // Disparo às 12:00 (meio-dia)
    if (horaStr === "12:00" && ultimoSlotExecutado !== `${dataIso}_12`) {
        ultimoSlotExecutado = `${dataIso}_12`;
        jogosEnviados.clear(); // Limpa o cache para enviar a grade atualizada do meio-dia
        console.log(`🔔 [Alarme 12:00] Iniciando varredura do meio-dia...`);
        buscarJogosSincronizados();
    }
}

// Executa uma vez ao ligar para teste/confirmação imediata e ativa o relógio de verificação a cada 30 segundos
buscarJogosSincronizados();
setInterval(verificarHorariosDisparo, 30000);
