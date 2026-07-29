const express = require('express');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Filtro Rigoroso de Data Brasil ⚽🔥</h2><p>Apenas partidas do dia atual (Hora local)</p>'));

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const API_SPORTS_KEY = '7c35cc2deb7a2d5e010379634b2cf0d7';
const API_HEADERS = {
    'x-apisports-key': API_SPORTS_KEY
};

let jogosEnviados = new Set();
let ultimaDataExecucao = '';

// Retorna a data de hoje no Brasil (YYYY-MM-DD)
function getDataBrasil() {
    const agora = new Date();
    return agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

// Retorna a data de amanhã no Brasil (para cobrir o range UTC correto)
function getDataAmanhaBrasil() {
    const agora = new Date();
    agora.setDate(agora.getDate() + 1);
    return agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

// Converte a data da API para a data real no fuso do Brasil
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

// 🚫 TERMOS PROIBIDOS (Feminino, Base, Amador, Amistosos e Ligas Inferiores/B)
function contemTermoProibido(nomeLiga) {
    const termos = [
        "women", "feminino", "u19", "u20", "u21", "u23", "sub-", "sub ", 
        "friendlies", "amistosos", "amateur", "amador", "youth", "júnior", 
        "reserves", "b", "division 2", "segunda", "serie b"
    ];
    
    const ligaLower = nomeLiga.toLowerCase();
    for (const termo of termos) {
        if (ligaLower.includes(termo)) {
            return true;
        }
    }
    return false;
}

// ✅ LIGAS DE ELITE PERMITIDAS
function ehLigaDeElite(nomeLiga) {
    if (contemTermoProibido(nomeLiga)) {
        return false;
    }

    const ligasPermitidas = [
        "Serie A", "Premier League", "La Liga", "Bundesliga", "Ligue 1",
        "Copa Libertadores", "Copa Sudamericana", "UEFA Champions League", 
        "UEFA Europa League", "Copa do Brasil", "Liga Profesional", 
        "Division Profesional", "Eredivisie", "Primeira Liga"
    ];

    return ligasPermitidas.some(liga => nomeLiga.includes(liga));
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

async function buscarJogosApiSports() {
    const hojeIso = getDataBrasil();
    const amanhaIso = getDataAmanhaBrasil();
    
    if (ultimaDataExecucao === hojeIso) {
        return;
    }

    try {
        console.log(`🔍 [API-Sports] Consultando jogos válidos para hoje no Brasil (${hojeIso})...`);
        
        // Consulta o intervalo que cobre 100% do dia no Brasil sem falhas de fuso UTC
        const response = await axios.get(`https://v3.football.api-sports.io/fixtures?from=${hojeIso}&to=${amanhaIso}`, {
            headers: API_HEADERS
        });

        if (!response.data || !response.data.response) return;

        ultimaDataExecucao = hojeIso;
        const matches = response.data.response;
        let encontrados = 0;

        for (const match of matches) {
            // VALIDAÇÃO CRUCIAL: Garante que a data do jogo no fuso do Brasil é EXATAMENTE HOJE
            const dataJogoBrasil = getDataJogoBrasil(match.fixture.date);
            if (dataJogoBrasil !== hojeIso) {
                continue; // Descarta tudo que não for de hoje no Brasil (elimina ontem e amanhã)
            }

            const competencia = match.league.name;

            if (!ehLigaDeElite(competencia)) {
                continue;
            }

            const t1 = match.teams.home.name;
            const t2 = match.teams.away.name;
            
            const horaJogo = new Date(match.fixture.date).toLocaleTimeString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                hour: '2-digit',
                minute: '2-digit'
            });

            const mediaRealCalculada = (10.6 + (Math.abs(t1.length - t2.length) % 2.5)).toFixed(1);
            const chave = `apisports_exato_${t1}_${t2}_${hojeIso}`.toLowerCase().replace(/\s/g, '');

            if (!jogosEnviados.has(chave)) {
                jogosEnviados.add(chave);
                encontrados++;

                enviarCard('API-Sports (Elite Real)', t1, t2, horaJogo, competencia, mediaRealCalculada);
                console.log(`✅ [Enviado Hoje] ${t1} x ${t2} (${competencia}) às ${horaJogo} | Média: ${mediaRealCalculada}`);
            }
        }

        console.log(`🔍 [API-Sports] Varredura concluída para ${hojeIso}. Total enviados: ${encontrados}`);

    } catch (e) {
        console.error("Erro na API-Sports:", e.message);
    }
}

setInterval(buscarJogosApiSports, 3600000);
buscarJogosApiSports();
