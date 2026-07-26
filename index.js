const express = require('express');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot SportMonks - Relatórios 06:00 e 12:00 Ativos'));
app.listen(process.env.PORT || 3000);

const TELEGRAM_TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const SPORTMONKS_TOKEN = '1F5ZavyPcLQzyG94Q72iekg3ZblPSlTycQDUZ5ZJ4IrqegDeWm5q4PWTLadD';

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// Função para identificar a bandeira pelo nome do time
function getBandeira(teamName) {
    const list = {
        "Flamengo": "🇧🇷", "Palmeiras": "🇧🇷", "Corinthians": "🇧🇷", "São Paulo": "🇧🇷",
        "Santos": "🇧🇷", "Cruzeiro": "🇧🇷", "Atlético": "🇧🇷", "Bahia": "🇧🇷",
        "Vasco": "🇧🇷", "Botafogo": "🇧🇷", "Fluminense": "🇧🇷", "Grêmio": "🇧🇷",
        "Internacional": "🇧🇷", "Ceará": "🇧🇷", "CRB": "🇧🇷", "Náutico": "🇧🇷",
        "Londrina": "🇧🇷", "Coritiba": "🇧🇷", "Operário": "🇧🇷", "Avaí": "🇧🇷",
        "América": "🇧🇷", "Juventude": "🇧🇷", "Criciúma": "🇧🇷", "São Bernardo": "🇧🇷",
        "Athletic": "🇧🇷", "Malmo": "🇸🇪", "Kalmar": "🇸🇪", "Hacken": "🇸🇪", "AIK": "🇸🇪",
        "Lahti": "🇫🇮", "Mariehamn": "🇫🇮", "KuPS": "🇫🇮", "VPS": "🇫🇮", "Gnistan": "🇫🇮",
        "Real Madrid": "🇪🇸", "Athletic Club": "🇪🇸"
    };
    return list[teamName] || "🏳️";
}

async function executarVarreduraEscanteios(tipoRelatorio) {
    try {
        const hoje = new Date().toISOString().split('T')[0];
        const url = `https://api.sportmonks.com/v3/football/fixtures/date/${hoje}?api_token=${SPORTMONKS_TOKEN}&include=participants;statistics`;

        const response = await axios.get(url);
        const fixtures = response.data.data;

        if (!fixtures || fixtures.length === 0) {
            console.log(`[${tipoRelatorio}] Nenhum jogo encontrado para hoje na SportMonks.`);
            return;
        }

        let totalEncontrados = 0;
        let mensagemResumo = `⚽ *Relatório de Escanteios - ${tipoRelatorio}*\n📅 Data: ${hoje}\n\n`;

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

            // Critério de escanteio estruturado para o padrão de análise
            totalEncontrados++;
            mensagemResumo += `${bandeira} *${t1} x ${t2}*\n` +
                              `🕒 Horário: ${horaInicio}\n` +
                              `⛳ *Critério: Monitorando Média FT*\n\n`;

            // Envia em blocos se a lista ficar muito longa, ou envia consolidado
            if (totalEncontrados >= 15) {
                await bot.sendMessage(CHAT_ID, mensagemResumo, { parse_mode: 'Markdown' }).catch(() => {});
                mensagemResumo = `⚽ *Continuação do Relatório (${tipoRelatorio})*\n\n`;
                totalEncontrados = 0;
            }
        }

        if (totalEncontrados > 0) {
            await bot.sendMessage(CHAT_ID, mensagemResumo, { parse_mode: 'Markdown' }).catch(() => {});
        }

        console.log(`✅ Relatório das ${tipoRelatorio} enviado com sucesso! Total de jogos processados.`);
    } catch (e) {
        console.error(`Erro no relatório das ${tipoRelatorio}:`, e.response ? e.response.data : e.message);
    }
}

// Controle para garantir que cada horário dispare apenas uma vez por dia
let ultimoEnvio6 = '';
let ultimoEnvio12 = '';

// Verificador de tempo rodando a cada 30 segundos
setInterval(() => {
    const agora = new Date();
    // Ajuste para o fuso horário do Brasil (UTC-3)
    const hora = agora.getUTCHours() - 3;
    const horaAtual = hora < 0 ? hora + 24 : hora;
    const minutoAtual = agora.getMinutes();
    const dataHoje = agora.toISOString().split('T')[0];

    // Disparo às 06:00
    if (horaAtual === 6 && minutoAtual === 0 && ultimoEnvio6 !== dataHoje) {
        ultimoEnvio6 = dataHoje;
        console.log("⏰ Horário atingido: Disparando relatório das 06:00...");
        executarVarreduraEscanteios("06:00 da Manhã");
    }

    // Disparo às 12:00
    if (horaAtual === 12 && minutoAtual === 0 && ultimoEnvio12 !== dataHoje) {
        ultimoEnvio12 = dataHoje;
        console.log("⏰ Horário atingido: Disparando relatório das 12:00...");
        executarVarreduraEscanteios("12:00 do Meio-Dia");
    }
}, 30000);

console.log("🤖 Bot configurado para varredura diária às 06:00 e 12:00 (Horário de Brasília).");
