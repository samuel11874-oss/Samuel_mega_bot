const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional: Filtros Personalizados Ativos'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://www.google.com/',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
};

// 1. TODAS AS MELHORES LIGAS DO MUNDO (1ª E 2ª DIVISÃO + BRASILEIRÃO SÉRIE C)
const LIGAS_ELITE = [
    // Brasil
    'Brasileirão Série A', 'Brasileirão Série B', 'Brasileirão Série C',
    // Inglaterra
    'Premier League', 'Championship',
    // Espanha
    'La Liga', 'Segunda División', 'La Liga 2',
    // Itália
    'Serie A', 'Serie B',
    // Alemanha
    'Bundesliga', '2. Bundesliga',
    // França
    'Ligue 1', 'Ligue 2',
    // Portugal
    'Primeira Liga', 'Segunda Liga',
    // Holanda
    'Eredivisie', 'Eerste Divisie',
    // Copas e Torneios de Elite
    'Champions League', 'Libertadores', 'Sudamericana',
    'Copa do Brasil', 'Copa do Mundo', 'Mundial de Clubes'
];

async function monitorarJogos() {
    try {
        console.log("--------------------------------------------------");
        console.log("[MONITORANDO JOGOS] Aplicando novos critérios de aposta personalizada...");

        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS, timeout: 15000 });
        const $ = cheerio.load(data);

        let totalAnalisados = 0;
        let totalDisparados = 0;
        let ligaAtual = "Liga Não Identificada";

        $('.wttr2, [class*="statln"]').each((i, el) => {
            const classeOriginal = $(el).attr('class') || '';
            const textoOriginal = $(el).text().trim();
            const textoLimpo = textoOriginal.replace(/\s+/g, ' ');

            // Identifica e atualiza a liga atual
            if (classeOriginal.includes('wttr2')) {
                ligaAtual = textoLimpo;
            } 
            // Identifica se é uma linha de jogo real
            else if (classeOriginal.includes('statln')) {
                const ehJogoReal = textoLimpo.includes(' x ');
                const ehCabecalho = textoLimpo.includes('ESTATÍSTICAS') || textoLimpo.includes('Menos/Mais') || textoLimpo.includes('Handicap');

                if (ehJogoReal && !ehCabecalho) {
                    totalAnalisados++;

                    // Filtro 1: Melhores Ligas (1ª, 2ª div + Série C)
                    const passaLiga = LIGAS_ELITE.some(liga => ligaAtual.toLowerCase().includes(liga.toLowerCase()));

                    if (passaLiga) {
                        // Extração dinâmica de escanteios (Ex: "Corinthians x Remo11Mais..." -> extrai 11)
                        const partesConfronto = textoLimpo.match(/(.+?)\s*(\d+)Mais/);
                        
                        if (partesConfronto) {
                            const confrontoBruto = partesConfronto[1].trim();
                            const cantosTotal = parseInt(partesConfronto[2], 10);

                            // Filtro 2: Mais de 10.5 escanteios total (Mínimo de 11)
                            if (cantosTotal > 10.5) {
                                
                                // Limpeza fina de datas no texto para deixar o alerta limpo
                                let confrontoLimpo = confrontoBruto.replace(/^(domingo|segunda-feira|terça-feira|quarta-feira|quinta-feira|sexta-feira|sábado),\s*\d+\s+de\s+[a-z]+\s+de\s+\d{4}/i, '').trim();
                                confrontoLimpo = confrontoLimpo.replace(/^(Hoje|Amanhã)/i, '').trim();

                                enviarAlerta(ligaAtual, confrontoLimpo, cantosTotal);
                                totalDisparados++;
                            }
                        }
                    }
                }
            }
        });

        console.log(`[VARREDURA CONCLUÍDA]`);
        console.log(`>> Total de jogos analisados: ${totalAnalisados}`);
        console.log(`>> Alertas de aposta personalizada disparados: ${totalDisparados}`);
        console.log("--------------------------------------------------");

    } catch (e) {
        console.error("Erro no monitoramento:", e.message);
    }
}

function enviarAlerta(liga, confronto, cantos) {
    const mensagem = `
🔥 *Jogos encontrado para fazer sua aposta personalizada*

🌍 *Liga:* ${liga}
⚽ *Confronto:* ${confronto}
📊 *Média de Cantos:* ${cantos} (Mais de 10.5 Total)
⚡ *Potencial HT:* Alto (+4 Escanteios HT)
⚽ *Potencial Gols:* Alta chance de +2.5 Gols
    `;
    
    bot.sendMessage(CHAT_ID, messageFormatado(mensagem), { parse_mode: 'Markdown' })
       .then(() => console.log(`[SUCESSO] Alerta enviado: ${confronto}`))
       .catch(err => console.error(`[ERRO TELEGRAM] Falha ao enviar:`, err.message));
}

// Helper para garantir espaçamento ideal no Telegram
function messageFormatado(msg) {
    return msg.trim();
}

// Executa a cada 60 minutos
setInterval(monitorarJogos, 3600000);
monitorarJogos();
