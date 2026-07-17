const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Captura Total de Hoje'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

let jogosEnviados = new Set();

// Função para pegar o dia e o mês atual no formato do site (ex: "17 de julho")
function obterDataBr() {
    const agora = new Date();
    const opcoes = { day: 'numeric', month: 'long' };
    // Força o fuso horário do Brasil para não dar erro no servidor internacional do Render
    return agora.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', ...opcoes }).toLowerCase();
}

async function monitorarJogos() {
    try {
        const dataHoje = obterDataBr();
        console.log(`[LOG] Iniciando varredura bruta para a data: ${dataHoje}`);
        
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 30000
        });

        const $ = cheerio.load(response.data);
        let totalEncontrado NestaVarredura = 0;

        // Vasculha todas as linhas de tabelas estruturadas do site
        $('tr').each((i, el) => {
            const linhaTexto = $(el).text().trim().replace(/\s+/g, ' ');
            const linhaLower = linhaTexto.toLowerCase();

            // REGRA 1: Precisa ser um confronto válido contendo " x "
            if (linhaTexto.includes(' x ')) {
                
                // REGRA 2: Filtro de segurança para garantir que o jogo pertence ao bloco de hoje
                // Ignora se a linha mencionar textualmente outro mês ou outro dia específico
                if (linhaLower.includes(' de ') && !linhaLower.includes(dataHoje)) {
                    return; 
                }

                // Captura o texto limpo da linha (Nome dos times + Estatísticas textuais que estiverem juntas)
                const jogoFormatado = linhaTexto.trim();

                if (jogoFormatado.length > 8 && !jogosEnviados.has(jogoFormatado)) {
                    jogosEnviados.add(jogoFormatado);
                    totalEncontradoNestaVarredura++;

                    // Envia o texto completo do jogo e das médias direto para o Telegram, sem travas
                    const mensagem = `⚽ *Jogo de Hoje:*\n${jogoFormatado}`;
                    bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                    
                    console.log(`[SUCESSO] Jogo detectado e enviado: ${jogoFormatado}`);
                }
            }
        });

        console.log(`[LOG] Varredura finalizada. Novos jogos enviados nesta rodada: ${totalEncontradoNestaVarredura}`);

    } catch (e) {
        console.error("[ERRO CRÍTICO] Falha ao acessar ou ler o site:", e.message);
    }
}

// Limpa a lista de controle a cada 24 horas para reiniciar o monitoramento no dia seguinte
setInterval(() => { 
    jogosEnviados.clear(); 
    console.log("[LOG] Cache de controle diário reiniciado.");
}, 86400000); 

// Varredura programada para rodar de 5 em 5 minutos
setInterval(monitorarJogos, 300000); 

// Execução imediata assim que o Render iniciar o serviço
monitorarJogos();
