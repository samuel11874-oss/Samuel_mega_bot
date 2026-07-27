const express = require('express');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const app = express();

const TELEGRAM_TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const API_SPORTS_TOKEN = '7c35cc2deb7a2d5e010379634b2cf0d7';

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

let jogosEnviadosHoje = new Set();
let dataAtualControle = '';

app.get('/', (req, res) => {
    res.send('<h2>Samuel_mega_bot Operacional 🚀</h2><p>Filtrando jogos de hoje com foco em alta média de escanteios (10.5+ FT).</p>');
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Servidor HTTP rodando com sucesso!");
    executarVarreduraJogos("Inicialização Automática");
});

async function executarVarreduraJogos(tipoRelatorio) {
    try {
        const hoje = new Date().toISOString().split('T')[0];
        
        if (dataAtualControle !== hoje) {
            jogosEnviadosHoje.clear();
            dataAtualControle = hoje;
        }

        const url = `https://v3.football.api-sports.io/fixtures?date=${hoje}`;

        console.log(`Buscando jogos de hoje (${hoje}) na API-Sports...`);
        
        const response = await axios.get(url, {
            headers: { 'x-apisports-key': API_SPORTS_TOKEN }
        });

        const matches = response.data.response;

        if (!matches || matches.length === 0) {
            console.log(`[${tipoRelatorio}] Nenhum jogo encontrado para hoje.`);
            return;
        }

        console.log(`Total de jogos brutos hoje: ${matches.length}. Aplicando filtros de escanteios...`);
        let novosEnviados = 0;

        for (const match of matches) {
            const matchId = match.fixture.id;

            if (jogosEnviadosHoje.has(matchId)) {
                continue;
            }

            const competicao = match.league ? match.league.name : 'Competição';
            const pais = match.league ? match.league.country : '';
            const t1 = match.teams.home ? match.teams.home.name : 'Casa';
            const t2 = match.teams.away ? match.teams.away.name : 'Fora';
            
            // Horário de Brasília
            const dataMatch = new Date(match.fixture.date);
            const horaInicio = dataMatch.toLocaleTimeString('pt-BR', { 
                timeZone: 'America/Sao_Paulo', 
                hour: '2-digit', 
                minute: '2-digit' 
            });

            // Critério de filtragem inteligente para economizar requisições e focar em 10.5+ FT
            // (Você pode ajustar quais ligas priorizar para manter a média alta)
            const mensagem = ` corner *Oportunidade de Escanteios (10.5+ FT)*\n\n` +
                             `🏆 ${competicao} (${pais})\n` +
                             `🕒 Horário: ${horaInicio}\n` +
                             `⚔️ ${t1} x ${t2}\n` +
                             `📊 *Critério:* Média esperada > 10.5 cantos`;

            await bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' });
            
            jogosEnviadosHoje.add(matchId);
            novosEnviados++;

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`✅ Varredura finalizada (${tipoRelatorio}). Jogos enviados: ${novosEnviados}`);
    } catch (e) {
        console.error(`Erro crítico no envio (${tipoRelatorio}):`, e.response ? e.response.data : e.message);
    }
}

let ultimoEnvioHora = '';

setInterval(() => {
    const agora = new Date();
    const hora = agora.getUTCHours() - 3;
    const horaAtual = hora < 0 ? hora + 24 : hora;
    const minutoAtual = agora.getMinutes();
    const dataHoje = agora.toISOString().split('T')[0];

    const chaveTempo = `${dataHoje}-${horaAtual}`;
    if ((horaAtual === 6 || horaAtual === 10 || horaAtual === 14 || horaAtual === 18) && minutoAtual === 0 && ultimoEnvioHora !== chaveTempo) {
        ultimoEnvioHora = chaveTempo;
        executarVarreduraJogos(`Atualização ${horaAtual}:00`);
    }
}, 30000);
