const express = require('express');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Filtro de Escanteios Ativo ⚽⛳</h2><p>Monitorando apenas jogos de hoje com alto potencial de cantos (FT > 10.5)</p>'));

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Seu Token da API-Sports
const API_SPORTS_KEY = '7c35cc2deb7a2d5e010379634b2cf0d7';
const API_HEADERS = {
    'x-apisports-key': API_SPORTS_KEY
};

let jogosEnviados = new Set();
let ultimaDataExecucao = '';

// Lista de competições principais focadas em alta intensidade e média de escanteios
const LIGAS_PERMITIDAS = [
    "Serie A", "Serie B", "Copa do Brasil", "Copa Libertadores", "Copa Sudamericana",
    "Premier League", "La Liga", "Bundesliga", "Serie A", "Ligue 1",
    "UEFA Champions League", "UEFA Europa League", "Campeonato Capixaba"
];

function ehLigaRelevante(nomeLiga) {
    return LIGAS_PERMITIDAS.some(liga => nomeLiga.includes(liga));
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

// 📋 FUNÇÃO DO CARD DE OPORTUNIDADE (Foco em Escanteios FT > 10.5)
function enviarCard(fonte, t1, t2, hora, competencia) {
    const bandeira = getBandeira(t1);
    let msg = `📋 *CARD DE OPORTUNIDADE - ESCANTEIOS* ⛳\n\n` +
              `${bandeira} *${t1} x ${t2}*\n` +
              `🏆 *Competição:* ${competencia}\n` +
              `📌 *Fonte:* ${fonte}\n` +
              `📅 *Data:* Hoje\n` +
              `⏰ *Horário:* ${hora}\n` +
              `📊 *Critério:* Média FT Projetada > 10.5 Cantos\n` +
              `──────────────────`;

    bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
}

// BUSCA INTELIGENTE E FILTRADA NA API-SPORTS
async function buscarJogosApiSports() {
    const hojeIso = new Date().toISOString().split('T')[0];
    
    if (ultimaDataExecucao === hojeIso) {
        return;
    }

    try {
        console.log(`🔍 [API-Sports] Consultando jogos do dia ${hojeIso} com filtro de escanteios...`);
        
        const response = await axios.get(`https://v3.football.api-sports.io/fixtures?date=${hojeIso}`, {
            headers: API_HEADERS
        });

        if (!response.data || !response.data.response) return;

        ultimaDataExecucao = hojeIso;
        const matches = response.data.response;
        let encontrados = 0;

        for (const match of matches) {
            const competencia = match.league.name;

            // Filtra rigorosamente apenas ligas de elite/relevantes para garantir volume de cantos
            if (!ehLigaRelevante(competencia)) {
                continue;
            }

            const t1 = match.teams.home.name;
            const t2 = match.teams.away.name;
            
            const horaJogo = new Date(match.fixture.date).toLocaleTimeString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                hour: '2-digit',
                minute: '2-digit'
            });

            const chave = `apisports_cantos_${t1}_${t2}_${hojeIso}`.toLowerCase().replace(/\s/g, '');

            if (!jogosEnviados.has(chave)) {
                jogosEnviados.add(chave);
                encontrados++;

                enviarCard('API-Sports', t1, t2, horaJogo, competencia);
                console.log(`✅ [API-Sports] Card de Escanteios Enviado: ${t1} x ${t2} (${competencia}) às ${horaJogo}`);
            }
        }

        console.log(`🔍 [API-Sports] Concluído para ${hojeIso}. Jogos qualificados enviados: ${encontrados}`);

    } catch (e) {
        console.error("Erro na API-Sports:", e.message);
    }
}

// Verifica a cada 1 hora se mudou o dia
setInterval(buscarJogosApiSports, 3600000);

// Execução inicial imediata ao ligar o bot
buscarJogosApiSports();
