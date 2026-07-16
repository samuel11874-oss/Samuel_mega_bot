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

const CACHE_FILE = path.join(__dirname, 'jogos_enviados.json');
let cacheJogos = carregarCache();

function carregarCache() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const dados = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
            const agora = Date.now();
            const cacheLimpo = {};
            for (const [chave, ts] of Object.entries(dados)) {
                if (agora - ts < 24 * 60 * 60 * 1000) {
                    cacheLimpo[chave] = ts;
                }
            }
            return cacheLimpo;
        }
    } catch (e) {}
    return {};
}

function salvarCache() {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheJogos), 'utf8');
    } catch (e) {}
}

function limparNomeLiga(liga) {
    let nome = liga.replace(/ESTATÍSTICAS DE ESCANTEIOS/gi, '').trim();
    const palavras = nome.split(' ');
    const metade = Math.floor(palavras.length / 2);
    if (palavras.length > 1) {
        const primeiraMetade = palavras.slice(0, metade).join(' ');
        const segundaMetade = palavras.slice(metade).join(' ');
        if (primeiraMetade === segundaMetade) nome = primeiraMetade;
    }
    return nome.trim();
}

// NOVO FILTRO INTELIGENTE: Lista Negra de Dias Futuros
function ehParaProcessar(texto) {
    const txt = texto.toLowerCase();
    
    // Se tiver "hoje" ou "amanhã" (jogos da madrugada/noite sul-americana), aceita.
    if (txt.includes('hoje')) return true;
    if (txt.includes('amanhã')) return true;

    // Pega o dia da semana atual no Brasil
    const agora = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const diasSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    const diaSemanaHoje = diasSemana[agora.getDay()];
    
    // Se explicitamente diz o dia de hoje (ex: "quinta"), aceita.
    if (txt.includes(diaSemanaHoje)) return true;

    // BLOQUEIO: Se tiver qualquer OUTRO dia da semana na string, é jogo da semana que vem. Bloqueia!
    for (let d of diasSemana) {
        if (d !== diaSemanaHoje && txt.includes(d)) return false; 
    }
    
    // BLOQUEIO: Se tiver um mês futuro explicitamente
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const mesHoje = meses[agora.getMonth()];
    for (let m of meses) {
        if (m !== mesHoje && txt.includes(`de ${m}`)) return false;
    }

    // Se chegou até aqui (não tem dia futuro explícito), significa que é apenas o horário ou nome do time. Aceita!
    return true;
}

// Limpa horários (16:00) e datas coladas no nome do primeiro time
function limparPrefixo(texto) {
    let t = texto;
    t = t.replace(/^(domingo|segunda-feira|terça-feira|quarta-feira|quinta-feira|sexta-feira|sábado|hoje|amanhã)[^a-z0-9]*/i, '');
    t = t.replace(/^\d{1,2}\s+de\s+[a-zç]+\s*/i, '');
    t = t.replace(/^\d{1,2}\/\d{1,2}\s*/, '');
    t = t.replace(/^\d{2}:\d{2}\s*/, ''); 
    return t.trim();
}

async function monitorarJogos() {
    try {
        console.log("--------------------------------------------------");
        console.log("[MONITORANDO JOGOS] Varrendo ligas - Buscando > 10.5 cantos...");

        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS, timeout: 15000 });
        const $ = cheerio.load(data);

        let totalAnalisados = 0;
        let totalDisparados = 0;
        let ligaAtual = "Liga Não Identificada";

        cacheJogos = carregarCache();
        const jogosProcessadosNestaRodada = new Set();

        $('.wttr2, [class*="statln"]').each((i, el) => {
            const classeOriginal = $(el).attr('class') || '';
            const textoOriginal = $(el).text().trim();
            const textoLimpo = textoOriginal.replace(/\s+/g, ' ');

            if (classeOriginal.includes('wttr2')) {
                const elClonado = $(el).clone();
                elClonado.find('[class*="statln"]').remove();
                ligaAtual = limparNomeLiga(elClonado.text().trim());
            } 
            else if (classeOriginal.includes('statln')) {
                const ehJogoReal = textoLimpo.includes(' x ');
                const ehCabecalho = textoLimpo.includes('ESTATÍSTICAS') || textoLimpo.includes('Menos/Mais') || textoLimpo.includes('Handicap');

                if (ehJogoReal && !ehCabecalho) {
                    if (ehParaProcessar(textoLimpo)) {
                        
                        const partes = textoLimpo.split(' x ');
                        if (partes.length >= 2) {
                            let timeA = limparPrefixo(partes[0]);
                            let resto = partes.slice(1).join(' x ').trim();

                            let timeB = "";
                            let cantosTotal = 0;

                            // Lê o Time B e extrai médias com casas decimais (ex: 11.5)
                            const matchPadrao = resto.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*(?:Mais|Menos|%)/i);
                            if (matchPadrao) {
                                timeB = matchPadrao[1].trim();
                                cantosTotal = parseFloat(matchPadrao[2]);
                            } else {
                                const matchFallback = resto.match(/^(.+?)\s+(\d+(?:\.\d+)?)(?:\s|$)/);
                                if (matchFallback) {
                                    timeB = matchFallback[1].trim();
                                    cantosTotal = parseFloat(matchFallback[2]);
                                }
                            }

                            if (timeB && cantosTotal > 0) {
                                const confrontoLimpo = `${timeA} x ${timeB}`;
                                const chaveJogo = `${confrontoLimpo.toLowerCase()}_${ligaAtual.toLowerCase()}`;

                                if (jogosProcessadosNestaRodada.has(chaveJogo)) return;
                                jogosProcessadosNestaRodada.add(chaveJogo);

                                totalAnalisados++;

                                // CRITÉRIO DEFINITIVO: MAIS DE 10.5 ESCANTEIOS
                                if (cantosTotal > 10.5) {
                                    if (cacheJogos[chaveJogo]) {
                                        console.log(`[IGNORADO - JÁ ENVIADO] ${confrontoLimpo}`);
                                    } else {
                                        enviarAlerta(ligaAtual, confrontoLimpo, cantosTotal);
                                        cacheJogos[chaveJogo] = Date.now();
                                        salvarCache();
                                        totalDisparados++;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        console.log(`[VARREDURA CONCLUÍDA]`);
        console.log(`>> Total de jogos mapeados: ${totalAnalisados}`);
        console.log(`>> Alertas (>10.5) enviados: ${totalDisparados}`);
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
📊 *Média:* ${cantos} Cantos
    `;
    
    bot.sendMessage(CHAT_ID, mensagem.trim(), { parse_mode: 'Markdown' })
       .then(() => console.log(`[SUCESSO] Alerta enviado: ${confronto}`))
       .catch(err => console.error(`[ERRO TELEGRAM] Falha ao enviar:`, err.message));
}

// Executa a cada 60 minutos
setInterval(monitorarJogos, 3600000);
monitorarJogos();
