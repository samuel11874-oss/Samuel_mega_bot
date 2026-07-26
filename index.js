const express = require('express');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const app = express();

const TELEGRAM_TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const SPORTMONKS_TOKEN = '1F5ZavyPcLQzyG94Q72iekg3ZblPSlTycQDUZ5ZJ4IrqegDeWm5q4PWTLadD';

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// Página inicial do servidor
app.get('/', (req, res) => {
    res.send('<h2>Bot SportMonks Operacional 🚀</h2><p>Acesse <a href="/jogos">/jogos</a> para ver a lista completa de partidas de hoje.</p>');
});

// Nova rota para visualizar todos os jogos de hoje diretamente no navegador
app.get('/jogos', async (req, res) => {
    try {
        const hoje = new Date().toISOString().split('T')[0];
        const url = `https://api.sportmonks.com/v3/football/fixtures/date/${hoje}?api_token=${SPORTMONKS_TOKEN}&include=participants`;

        const response = await axios.get(url);
        const fixtures = response.data.data;

        if (!fixtures || fixtures.length === 0) {
            return res.send(`<h2>Nenhum jogo encontrado para hoje (${hoje}).</h2>`);
        }

        let html = `<h2>⚽ Lista de Jogos de Hoje (${hoje})</h2><ul>`;
        let total = 0;

        for (const fixture of fixtures) {
            const participants = fixture.participants || [];
            if (participants.length < 2) continue;

            const homeTeam = participants.find(p => p.meta.location === 'home');
            const awayTeam = participants.find(p => p.meta.location === 'away');

            if (!homeTeam || !awayTeam) continue;

            const t1 = homeTeam.name;
            const t2 = awayTeam.name;
            const horaInicio = fixture.starting_at ? fixture.starting_at.split(' ')[1].substring(0, 5) : '';

            total++;
            html += `<li><b>🕒 ${horaInicio}</b> — ${t1} x ${t2}</li>`;
        }

        html += `</ul><p><b>Total de jogos encontrados: ${total}</b></p>`;
        res.send(html);
    } catch (e) {
        res.status(500).send(`<h3>Erro ao buscar jogos da API:</h3><p>${e.message}</p>`);
    }
});

app.listen(process.env.PORT || 3000);

// Função para identificar bandeira
function getBandeira(teamName) {
    const list = {
        "Flamengo": "🇧🇷", "Palmeiras": "🇧🇷", "Corinthians": "🇧🇷", "São Paulo": "🇧🇷"
    };
    return list[teamName] || "🏳️";
}

// Função de disparo automático (06:00 e 12:00)
async function executarVarreduraJogos(tipoRelatorio) {
    try {
        const hoje = new Date().toISOString().split('T')[0];
        const url = `https://api.sportmonks.com/v3/football/fixtures/date/${hoje}?api_token=${SPORTMONKS_TOKEN}&include=participants`;

        const response = await axios.get(url);
        const fixtures = response.data.data;

        if (!fixtures || fixtures.length === 0) return;

        let totalEncontrados = 0;
        let mensagemResumo = `⚽ *Lista de Jogos do Dia - ${tipoRelatorio}*\n📅 Data: ${hoje}\n\n`;

        for (const fixture of fixtures) {
            const participants = fixture.participants || [];
            if (participants.length < 2) continue;

            const homeTeam = participants.find(p => p.meta.location === 'home');
            const awayTeam = participants.find(p => p.meta.location === 'away');

            if (!homeTeam || !awayTeam) continue;

            const t1 = homeTeam.name;
            const t2 = awayTeam.name;
            const bandeira = getBandeira(t1);
            const horaInicio = fixture.starting_at ? fixture.starting_at.split(' ')[1].substring(0, 5) : '';

            totalEncontrados++;
            mensagemResumo += `${bandeira} *${t1} x ${t2}*\n` +
                              `🕒 Horário: ${horaInicio}\n\n`;

            if (totalEncontrados >= 15) {
                await bot.sendMessage(CHAT_ID, mensagemResumo, { parse_mode: 'Markdown' }).catch(() => {});
                mensagemResumo = `⚽ *Continuação da Lista (${tipoRelatorio})*\n\n`;
                totalEncontrados = 0;
            }
        }

        if (totalEncontrados > 0) {
            await bot.sendMessage(CHAT_ID, mensagemResumo, { parse_mode: 'Markdown' }).catch(() => {});
        }
    } catch (e) {
        console.error(`Erro no relatório das ${tipoRelatorio}:`, e.message);
    }
}

let ultimoEnvio6 = '';
let ultimoEnvio12 = '';

setInterval(() => {
    const agora = new Date();
    const hora = agora.getUTCHours() - 3;
    const horaAtual = hora < 0 ? hora + 24 : hora;
    const minutoAtual = agora.getMinutes();
    const dataHoje = agora.toISOString().split('T')[0];

    if (horaAtual === 6 && minutoAtual === 0 && ultimoEnvio6 !== dataHoje) {
        ultimoEnvio6 = dataHoje;
        executarVarreduraJogos("06:00 da Manhã");
    }

    if (horaAtual === 12 && minutoAtual === 0 && ultimoEnvio12 !== dataHoje) {
        ultimoEnvio12 = dataHoje;
        executarVarreduraJogos("12:00 do Meio-Dia");
    }
}, 30000);
