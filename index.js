const express = require('express');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const app = express();

const TELEGRAM_TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const FOOTBALL_DATA_TOKEN = '0a34421534b24e9f9001d3cf5da69c57';

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

app.get('/', (req, res) => {
    res.send('<h2>Bot Football-Data Operacional 🚀</h2><p>O bot está enviando os jogos automaticamente para o seu Telegram.</p>');
});

// Inicia o servidor e já dispara a varredura logo na partida para testes
app.listen(process.env.PORT || 3000, () => {
    console.log("Servidor HTTP rodando com sucesso!");
    executarVarreduraJogos("Inicialização Automática");
});

async function executarVarreduraJogos(tipoRelatorio) {
    try {
        const hoje = new Date().toISOString().split('T')[0];
        const url = `https://api.football-data.org/v4/matches?date=${hoje}`;

        console.log(`Buscando jogos na Football-Data para a data: ${hoje}...`);
        const response = await axios.get(url, {
            headers: { 'X-Auth-Token': FOOTBALL_DATA_TOKEN }
        });
        const matches = response.data.matches;

        if (!matches || matches.length === 0) {
            console.log(`[${tipoRelatorio}] Nenhum jogo encontrado para hoje.`);
            await bot.sendMessage(CHAT_ID, `⚠️ Nenhum jogo encontrado na Football-Data para hoje (${hoje}).`);
            return;
        }

        console.log(`Total de jogos encontrados: ${matches.length}. Formatando e enviando...`);

        let totalEncontrados = 0;
        let mensagemResumo = `⚽ Lista de Jogos de Hoje (${tipoRelatorio})\n📅 Data: ${hoje}\n\n`;

        for (const match of matches) {
            const competicao = match.competition ? match.competition.name : 'Competição';
            const t1 = match.homeTeam ? match.homeTeam.name : 'Casa';
            const t2 = match.awayTeam ? match.awayTeam.name : 'Fora';
            
            // Converte o horário UTC para o horário de Brasília (UTC-3)
            const dataMatch = new Date(match.utcDate);
            const horaInicio = dataMatch.toLocaleTimeString('pt-BR', { 
                timeZone: 'America/Sao_Paulo', 
                hour: '2-digit', 
                minute: '2-digit' 
            });

            totalEncontrados++;
            mensagemResumo += `🏆 ${competicao}\n🕒 ${horaInicio} — ${t1} x ${t2}\n\n`;

            // Envia em blocos de 15 para não estourar o limite de tamanho do Telegram
            if (totalEncontrados >= 15) {
                await bot.sendMessage(CHAT_ID, mensagemResumo);
                mensagemResumo = `⚽ Continuação da Lista (${tipoRelatorio})\n\n`;
                totalEncontrados = 0;
            }
        }

        if (totalEncontrados > 0) {
            await bot.sendMessage(CHAT_ID, mensagemResumo);
        }
        console.log(`✅ Lista de jogos enviada com sucesso para o Telegram!`);
    } catch (e) {
        console.error(`Erro crítico no envio (${tipoRelatorio}):`, e.response ? e.response.data : e.message);
    }
}

// Controle para os disparos automáticos às 06:00 e 12:00
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
