const express = require('express');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const app = express();

const TELEGRAM_TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const FOOTBALL_DATA_TOKEN = '0a34421534b24e9f9001d3cf5da69c57';

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// Controle para evitar repetir jogos no mesmo dia
let jogosEnviadosHoje = new Set();
let dataAtualControle = '';

app.get('/', (req, res) => {
    res.send('<h2>Samuel_mega_bot Operacional 🚀</h2><p>O bot está monitorando e enviando todos os jogos do dia para o seu Telegram.</p>');
});

// Inicia o servidor e já dispara a varredura logo na partida para testes
app.listen(process.env.PORT || 3000, () => {
    console.log("Servidor HTTP rodando com sucesso!");
    executarVarreduraJogos("Inicialização Automática");
});

async function executarVarreduraJogos(tipoRelatorio) {
    try {
        const hoje = new Date().toISOString().split('T')[0];
        
        // Reseta os jogos enviados caso tenha virado o dia
        if (dataAtualControle !== hoje) {
            jogosEnviadosHoje.clear();
            dataAtualControle = hoje;
        }

        const url = `https://api.football-data.org/v4/matches?date=${hoje}`;

        console.log(`Buscando jogos na Football-Data para a data: ${hoje}...`);
        const response = await axios.get(url, {
            headers: { 'X-Auth-Token': FOOTBALL_DATA_TOKEN }
        });
        const matches = response.data.matches;

        if (!matches || matches.length === 0) {
            console.log(`[${tipoRelatorio}] Nenhum jogo encontrado para hoje.`);
            return;
        }

        console.log(`Total de jogos brutos encontrados: ${matches.length}. Verificando novidades...`);
        let novosEnviados = 0;

        for (const match of matches) {
            const matchId = match.id;

            // Se o jogo já foi enviado hoje, pula para o próximo (evita repetição)
            if (jogosEnviadosHoje.has(matchId)) {
                continue;
            }

            const competicao = match.competition ? match.competition.name : 'Competição';
            const t1 = match.homeTeam ? match.homeTeam.name : 'Casa';
            const t2 = match.awayTeam ? match.awayTeam.name : 'Fora';
            
            // Converte a data UTC para o horário de Brasília (UTC-3)
            const dataMatch = new Date(match.utcDate);
            const horaInicio = dataMatch.toLocaleTimeString('pt-BR', { 
                timeZone: 'America/Sao_Paulo', 
                hour: '2-digit', 
                minute: '2-digit' 
            });

            // Montagem do card limpo (sem filtros)
            const mensagem = `⚽ *Partida do Dia*\n\n` +
                             `🏆 ${competicao}\n` +
                             `🕒 Horário: ${horaInicio}\n` +
                             `⚔️ ${t1} x ${t2}`;

            await bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' });
            
            // Registra o ID do jogo como já enviado hoje
            jogosEnviadosHoje.add(matchId);
            novosEnviados++;

            // Pequeno intervalo para respeitar o limite de envio do Telegram
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`✅ Varredura finalizada (${tipoRelatorio}). Novos jogos enviados: ${novosEnviados}`);
    } catch (e) {
        console.error(`Erro crítico no envio (${tipoRelatorio}):`, e.response ? e.response.data : e.message);
    }
}

// Varredura automática nos horários principais do dia (06h, 10h, 14h, 18h)
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
