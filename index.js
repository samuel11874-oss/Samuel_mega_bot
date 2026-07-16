const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional: Palpites do Dia Ativos'));
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

// --- SISTEMA DE ARQUIVO FÍSICO PARA EVITAR DUPLICADOS ---
const CACHE_FILE = path.join(__dirname, 'jogos_enviados.json');
let jogosAlertados = carregarCache();
let diaDoCache = "";

function carregarCache() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            return new Set(JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')));
        }
    } catch (e) {
        console.error("Erro ao carregar cache do arquivo:", e.message);
    }
    return new Set();
}

function salvarCache() {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(Array.from(jogosAlertados)), 'utf8');
    } catch (e) {
        console.error("Erro ao salvar cache no arquivo:", e.message);
    }
}

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

function obterFiltrosHoje() {
    const agora = new Date();
    const formatadorDiaMes = new Intl.DateTimeFormat('pt-BR', { 
        timeZone: 'America/Sao_Paulo', 
        day: 'numeric', 
        month: 'long' 
    });
    const diaMesTexto = formatadorDiaMes.format(agora).toLowerCase();

    const formatadorSemana = new Intl.DateTimeFormat('pt-BR', { 
        timeZone: 'America/Sao_Paulo', 
        weekday: 'long' 
    });
    const diaSemanaTexto = formatadorSemana.format(agora).toLowerCase();

    return { diaMesTexto, diaSemanaTexto };
}

async function monitorarJogos() {
    try {
        console.log("--------------------------------------------------");
        console.log("[MONITORANDO JOGOS] Buscando jogos de hoje em todas as ligas...");

        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS, timeout: 15000 });
        const $ = cheerio.load(data);

        let totalAnalisados = 0;
        let totalDisparados = 0;
        let ligaAtual = "Liga Não Identificada";

        const { diaMesTexto, diaSemanaTexto } = obterFiltrosHoje();

        if (diaDoCache !== diaMesTexto) {
            jogosAlertados.clear();
            salvarCache();
            diaDoCache = diaMesTexto;
            console.log("[CACHE] Novo dia. Histórico de jogos limpo.");
        }

        $('.wttr2, [class*="statln"]').each((i, el) => {
            const classeOriginal = $(el).attr('class') || '';
            const textoOriginal = $(el).text().trim();
            const textoLimpo = textoOriginal.replace(/\s+/g, ' ');

            if (classeOriginal.includes('wttr2')) {
                // Remove os jogos filhos para pegar APENAS o nome limpo da liga
                const elClonado = $(el).clone();
                elClonado.find('[class*="statln"]').remove();
                ligaAtual = limparNomeLiga(elClonado.text().trim());
            } 
            else if (classeOriginal.includes('statln')) {
                const ehJogoReal = textoLimpo.includes(' x ');
                const ehCabecalho = textoLimpo.includes('ESTATÍSTICAS') || textoLimpo.includes('Menos/Mais') || textoLimpo.includes('Handicap');

                if (ehJogoReal && !ehCabecalho) {
                    const textoMinusc = textoLimpo.toLowerCase();
                    const ehDeHoje = textoMinusc.includes('hoje') || 
                                     (textoMinusc.includes(diaMesTexto) && textoMinusc.includes(diaSemanaTexto));

                    if (ehDeHoje) {
                        totalAnalisados++;

                        // Regex ultra precisa para separar Times, Escanteios e limpar as datas grudadas
                        const match = textoLimpo.match(/(.+?)\s+x\s+([^0-9]+)(\d+)/);
                        
                        if (match) {
                            let timeA = match[1].trim();
                            const timeB = match[2].trim();
                            const cantosTotal = parseInt(match[3], 10);

                            // Faxina nas datas grudadas no início do Time A
                            timeA = timeA
                                .replace(/^(domingo|segunda-feira|terça-feira|quarta-feira|quinta-feira|sexta-feira|sábado|hoje|amanhã),?/i, '')
                                .replace(/^\s*\d*\s*de\s*[a-z]+\s*de\s*\d{4}/i, '')
                                .trim();

                            const confrontoLimpo = `${timeA} x ${timeB}`;
                            const chaveJogo = `${confrontoLimpo.toLowerCase()}_${ligaAtual.toLowerCase()}`;

                            // CRITÉRIO: Média acima de 10.5 total (Mínimo de 11)
                            if (cantosTotal > 10.5) {
                                
                                if (jogosAlertados.has(chaveJogo)) {
                                    console.log(`[IGNORADO - DUPLICADO] Já enviado: ${confrontoLimpo}`);
                                } else {
                                    enviarAlerta(ligaAtual, confrontoLimpo, cantosTotal);
                                    jogosAlertados.add(chaveJogo);
                                    salvarCache();
                                    totalDisparados++;
                                }
                            }
                        }
                    }
                }
            }
        });

        console.log(`[VARREDURA CONCLUÍDA]`);
        console.log(`>> Total de jogos de HOJE analisados: ${totalAnalisados}`);
        console.log(`>> Novos alertas de valor disparados: ${totalDisparados}`);
        console.log("--------------------------------------------------");

    } catch (e) {
        console.error("Erro no monitoramento:", e.message);
    }
}

function enviarAlerta(liga, confronto, cantos) {
    const mensagem = `
🔥 *Palpites do dia para seu bilhete*

⚽ *Jogo:* ${confronto}
🌍 *Liga:* ${liga}
📊 *Média:* ${cantos} Cantos (>10.5 FT)
⚡ *HT:* Alta chance de +4.5 HT
    `;
    
    bot.sendMessage(CHAT_ID, mensagem.trim(), { parse_mode: 'Markdown' })
       .then(() => console.log(`[SUCESSO] Alerta enviado: ${confronto}`))
       .catch(err => console.error(`[ERRO TELEGRAM] Falha ao enviar:`, err.message));
}

// Executa a cada 60 minutos
setInterval(monitorarJogos, 3600000);
monitorarJogos();
