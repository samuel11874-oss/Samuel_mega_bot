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
    res.send('<h2>Samuel_mega_bot - Confrontos do Dia ⚽</h2><p>O bot está monitorando e enviando os confrontos de hoje para o seu Telegram.</p>');
});

// Inicia o servidor e já dispara a varredura logo na inicialização
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

        console.log(`Buscando confrontos do dia na Football-Data para a data: ${hoje}...`);
        const response = await axios.get(url, {
            headers: { 'X-Auth-Token': FOOTBALL_DATA_TOKEN }
        });
        const matches = response.data.matches;

        if (!matches || matches.length === 0) {
            console.log(`[${tipoRelatorio}] Nenhum confronto encontrado para hoje.`);
            return;
        }

        console.log(`Total de confrontos encontrados: ${matches.length}. Verificando envios...`);
        let novosEnviados = 0;

        for (const match of matches) {
            const matchId = match.id;

            // Se o confronto já foi enviado hoje, pula para o próximo
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

            // Montagem do card limpo focado nos confrontos do dia
            const mensagem = `⚽ *Confronto do Dia*\n\n` +
                             `🏆 ${competicao}\n` +
                             `🕒 Horário: ${horaInicio}\n` +
                             `⚔️ *${t1} x ${t2}*`;

            await bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' });
            
            // Registra o ID do jogo como já enviado hoje
            jogosEnviadosHoje.add(matchId);
            novosEnviados++;

            // Pequeno intervalo para respeitar o limite de envio do Telegram
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`✅ Varredura finalizada (${tipoRelatorio}). Novos confrontos enviados: ${novosEnviados}`);
    } catch (e) {
        console.error(`Erro crítico no envio (${tipoRelatorio}):`, e.response ? e.response.data : e.message);
    }
}

// Varredura automática a cada 1 hora para capturar novos jogos ou atualizações do dia
setInterval(() => {
    executarVarreduraJogos("Varredura Periódica");
}, 3600000);
