const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional: Mensagem Limpa e Jogos do Dia Ativos'));
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

// Função para limpar duplicações e sujeiras no nome da Liga
function limparNomeLiga(liga) {
    let nome = liga.replace(/ESTATÍSTICAS DE ESCANTEIOS/gi, '').trim();
    const palavras = nome.split(' ');
    const metade = Math.floor(palavras.length / 2);
    if (palavras.length > 1) {
        const primeiraMetade = palavras.slice(0, metade).join(' ');
        const segundaMetade = palavras.slice(metade).join(' ');
        if (primeiraMetade === segundaMetade) {
            nome = primeiraMetade;
        }
    }
    return nome.trim();
}

// Função para obter o dia de hoje em formato brasileiro (America/Sao_Paulo)
function obterFiltrosHoje() {
    const agora = new Date();
    const formatadorDiaMes = new Intl.DateTimeFormat('pt-BR', { 
        timeZone: 'America/Sao_Paulo', 
        day: 'numeric', 
        month: 'long' 
    });
    const diaMesTexto = formatadorDiaMes.format(agora).toLowerCase(); // Ex: "16 de julho"

    const formatadorSemana = new Intl.DateTimeFormat('pt-BR', { 
        timeZone: 'America/Sao_Paulo', 
        weekday: 'long' 
    });
    const diaSemanaTexto = formatadorSemana.format(agora).toLowerCase(); // Ex: "quinta-feira"

    return { diaMesTexto, diaSemanaTexto };
}

async function monitorarJogos() {
    try {
        console.log("--------------------------------------------------");
        console.log("[MONITORANDO JOGOS] Buscando apenas jogos de HOJE (Todas as Ligas)...");

        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS, timeout: 15000 });
        const $ = cheerio.load(data);

        let totalAnalisados = 0;
        let totalDisparados = 0;
        let ligaAtual = "Liga Não Identificada";

        const { diaMesTexto, diaSemanaTexto } = obterFiltrosHoje();
        console.log(`Filtro de data ativo para hoje: "${diaSemanaTexto}, ${diaMesTexto}" ou "Hoje"`);

        $('.wttr2, [class*="statln"]').each((i, el) => {
            const classeOriginal = $(el).attr('class') || '';
            const textoOriginal = $(el).text().trim();
            const textoLimpo = textoOriginal.replace(/\s+/g, ' ');

            // 1. Atualiza e limpa a liga atual
            if (classeOriginal.includes('wttr2')) {
                ligaAtual = limparNomeLiga(textoLimpo);
            } 
            // 2. Processa o jogo
            else if (classeOriginal.includes('statln')) {
                const ehJogoReal = textoLimpo.includes(' x ');
                const ehCabecalho = textoLimpo.includes('ESTATÍSTICAS') || textoLimpo.includes('Menos/Mais') || textoLimpo.includes('Handicap');

                if (ehJogoReal && !ehCabecalho) {
                    
                    // FILTRO RESTRITO: Somente jogos que acontecem HOJE
                    const textoMinusc = textoLimpo.toLowerCase();
                    const ehDeHoje = textoMinusc.includes('hoje') || 
                                     (textoMinusc.includes(diaMesTexto) && textoMinusc.includes(diaSemanaTexto));

                    if (ehDeHoje) {
                        totalAnalisados++;

                        // Extração precisa dos dados da partida
                        const partes = textoLimpo.split(' x ');
                        if (partes.length === 2) {
                            let timeA = partes[0].trim();
                            let restoTimeB = partes[1].trim();

                            // Remove datas/Hoje do nome do Time A
                            timeA = timeA.replace(/^(domingo|segunda-feira|terça-feira|quarta-feira|quinta-feira|sexta-feira|sábado|hoje),\s*\d*\s*(de\s*[a-z]+\s*de\s*\d{4})?/i, '').trim();
                            timeA = timeA.replace(/^(Hoje|Amanhã)/i, '').trim();

                            // Extrai o Time B parando antes da numeração de escanteio
                            const matchTimeB = restoTimeB.match(/^([^0-9]+)/);
                            const timeB = matchTimeB ? matchTimeB[1].trim() : restoTimeB;

                            // Extrai a média de escanteios total
                            const restoSemTimeB = restoTimeB.substring(timeB.length).trim();
                            const matchCantos = restoSemTimeB.match(/^(\d+)/);
                            const cantosTotal = matchCantos ? parseInt(matchCantos[1], 10) : 0;

                            const confrontoLimpo = `${timeA} x ${timeB}`;

                            // Filtro de Média: Mais de 10.5 escanteios total (Mínimo de 11)
                            if (cantosTotal > 10.5) {
                                enviarAlerta(ligaAtual, confrontoLimpo, cantosTotal);
                                totalDisparados++;
                            }
                        }
                    }
                }
            }
        });

        console.log(`[VARREDURA CONCLUÍDA]`);
        console.log(`>> Total de jogos de HOJE analisados: ${totalAnalisados}`);
        console.log(`>> Alertas disparados: ${totalDisparados}`);
        console.log("--------------------------------------------------");

    } catch (e) {
        console.error("Erro no monitoramento:", e.message);
    }
}

function enviarAlerta(liga, confronto, cantos) {
    // Mensagem ultra-limpa conforme solicitado
    const mensagem = `
🔥 *Jogos encontrado para fazer sua aposta personalizada*

⚽ *Jogo:* ${confronto}
🌍 *Liga:* ${liga}
📊 *Média:* ${cantos} Cantos (>10.5)
    `;
    
    bot.sendMessage(CHAT_ID, mensagem.trim(), { parse_mode: 'Markdown' })
       .then(() => console.log(`[SUCESSO] Alerta enviado: ${confronto}`))
       .catch(err => console.error(`[ERRO TELEGRAM] Falha ao enviar:`, err.message));
}

// Executa a cada 60 minutos (1 hora)
setInterval(monitorarJogos, 3600000);
monitorarJogos();
