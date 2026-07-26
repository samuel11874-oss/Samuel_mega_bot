const express = require('express');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot SportMonks Operacional - Conectado com Sucesso'));
app.listen(process.env.PORT || 3000);

const TELEGRAM_TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const SPORTMONKS_TOKEN = '1F5ZavyPcLQzyG94Q72iekg3ZblPSlTycQDUZ5ZJ4IrqegDeWm5q4PWTLadD';

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });
let jogosEnviados = new Set();

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

async function monitorarJogos() {
    try {
        // Pega a data atual no formato YYYY-MM-DD
        const hoje = new Date().toISOString().split('T')[0];
        
        // Requisição oficial na API v3 da SportMonks para os jogos do dia com participantes e estatísticas
        const url = `https://api.sportmonks.com/v3/football/fixtures/date/${hoje}?api_token=${SPORTMONKS_TOKEN}&include=participants;statistics`;

        const response = await axios.get(url);
        const fixtures = response.data.data;

        if (!fixtures || fixtures.length === 0) {
            console.log("Nenhum jogo encontrado para hoje na SportMonks.");
            return;
        }

        let encontrados = 0;

        for (const fixture of fixtures) {
            const participants = fixture.participants || [];
            if (participants.length < 2) continue;

            const homeTeam = participants.find(p => p.meta.location === 'home');
            const awayTeam = participants.find(p => p.meta.location === 'away');

            if (!homeTeam || !awayTeam) continue;

            const t1 = homeTeam.name;
            const t2 = awayTeam.name;
            const chave = `${t1}_${t2}`.toLowerCase().replace(/\s/g, '');

            if (jogosEnviados.has(chave)) continue;

            jogosEnviados.add(chave);
            encontrados++;

            const bandeira = getBandeira(t1);
            const horaInicio = fixture.starting_at ? fixture.starting_at.split(' ')[1].substring(0, 5) : '';

            const msg = `⚽ *Oportunidade - SportMonks*\n\n` +
                        `${bandeira} *${t1} x ${t2}*\n` +
                        `🕒 Horário: ${horaInicio}\n` +
                        `⛳ *Status: Dados oficiais sincronizados*`;

            await bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(() => {});
            console.log(`✅ ENVIADO (API): ${t1} x ${t2}`);
        }

        console.log(`🔍 Varredura SportMonks concluída. Jogos processados: ${encontrados}`);
    } catch (e) {
        console.error("Erro na consulta da API SportMonks:", e.response ? e.response.data : e.message);
    }
}

// Limpa o controle de jogos enviados a cada 1 hora
setInterval(() => { jogosEnviados.clear(); }, 3600000);

// Executa a varredura a cada 5 minutos
setInterval(monitorarJogos, 300000);

// Execução inicial imediata
monitorarJogos();
