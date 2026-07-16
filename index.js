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

// --- SISTEMA DE CACHE DIÁRIO ---
const CACHE_FILE = path.join(__dirname, 'jogos_enviados.json');
let cacheJogos = carregarCache();

function carregarCache() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const dados = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
            const agora = Date.now();
            const cacheLimpo = {};
            // Mantém no cache apenas jogos enviados nas últimas 24 horas
            for (const [chave, ts] of Object.entries(dados)) {
                if (agora - ts < 24 * 60 * 60 * 1000) {
                    cacheLimpo[chave] = ts;
                }
            }
            return cacheLimpo;
        }
    } catch (e) {
        console.error("Erro ao carregar cache:", e.message);
    }
    return {};
}

function salvarCache() {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheJogos), 'utf8');
    } catch (e) {
        console.error("Erro ao salvar cache:", e.message);
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

function obterFiltrosHojeEAmanha() {
    const agora = new Date();
    
    // Hoje no Brasil
    const formatadorHoje = new Intl.DateTimeFormat('pt-BR', { 
        timeZone: 'America/Sao_Paulo', 
        day: 'numeric', 
        month: 'long' 
    });
    const hojeTexto = formatadorHoje.format(agora).toLowerCase();

    const formatadorHojeComZero = new Intl.DateTimeFormat('pt-BR', { 
        timeZone: 'America/Sao_Paulo', 
        day: '2-digit', 
        month: 'long' 
    });
    const hojeTextoComZero = formatadorHojeComZero.format(agora).toLowerCase();

    // Amanhã no Brasil
    const amanha = new Date(agora);
    amanha.setDate(agora.getDate() + 1);

    const formatadorAmanha = new Intl.DateTimeFormat('pt-BR', { 
        timeZone: 'America/Sao_Paulo', 
        day: 'numeric', 
        month: 'long' 
    });
    const amanhaTexto = formatadorAmanha.format(amanha).toLowerCase();

    const formatadorAmanhaComZero = new Intl.DateTimeFormat('pt-BR', { 
        timeZone: 'America/Sao_Paulo', 
        day: '2-digit', 
        month: 'long' 
    });
    const amanhaTextoComZero = formatadorAmanhaComZero.format(amanha).toLowerCase();

    return { hojeTexto, hojeTextoComZero, amanhaTexto, amanhaTextoComZero };
}

async function monitorarJogos() {
    try {
        console.log("--------------------------------------------------");
        console.log("[MONITORANDO JOGOS] Analisando jogos do dia...");

        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS, timeout: 15000 });
        const $ = cheerio.load(data);

        let totalAnalisados = 0;
        let totalDisparados = 0;
        let ligaAtual = "Liga Não Identificada";

        cacheJogos = carregarCache();
        const { hojeTexto, hojeTextoComZero, amanhaTexto, amanhaTextoComZero } = obterFiltrosHojeEAmanha();
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
                    const textoMinusc = textoLimpo.toLowerCase();
                    const ligaMinusc = ligaAtual.toLowerCase();

                    // Validação de Hoje no site
                    const ehHojeNoSite = textoMinusc.includes('hoje') || 
                                         textoMinusc.includes(hojeTexto) || 
                                         textoMinusc.includes(hojeTextoComZero);

                    // Validação de Amanhã no site (para jogos noturnos sul-americanos)
                    const ehAmanhaNoSite = textoMinusc.includes('amanhã') || 
                                           textoMinusc.includes(amanhaTexto) || 
                                           textoMinusc.includes(amanhaTextoComZero);

                    const ehLigaSulAmericana = ligaMinusc.includes('brasil') || 
                                               ligaMinusc.includes('série a') || 
                                               ligaMinusc.includes('série b') || 
                                               ligaMinusc.includes('série c') || 
                                               ligaMinusc.includes('série d') || 
                                               ligaMinusc.includes('paulista') || 
                                               ligaMinusc.includes('carioca') || 
                                               ligaMinusc.includes('gaúcho') || 
                                               ligaMinusc.includes('mineiro') || 
                                               ligaMinusc.includes('nordeste') ||
                                               ligaMinusc.includes('argentina') ||
                                               ligaMinusc.includes('colômbia') ||
                                               ligaMinusc.includes('chile') ||
                                               ligaMinusc.includes('uruguai') ||
                                               ligaMinusc.includes('libertadores') ||
                                               ligaMinusc.includes('sudamericana');

                    // Só processa se for HOJE ou se for AMANHÃ em liga sul-americana (jogo da noite/madrugada de hoje)
                    const ehJogoDoDiaNoBrasil = ehHojeNoSite || (ehAmanhaNoSite && ehLigaSulAmericana);

                    if (ehJogoDoDiaNoBrasil) {
                        const regexData = /^(domingo|segunda-feira|terça-feira|quarta-feira|quinta-feira|sexta-feira|sábado|hoje|amanhã)(?:,\s*\d+\s+de\s+[a-z]+\s+de\s+\d{4})?/i;
                        const matchData = textoLimpo.match(regexData);
                        let textoSemData = textoLimpo;

                        if (matchData) {
                            textoSemData = textoLimpo.substring(matchData[0].length).trim();
                        }

                        // Regex inteligente com suporte a times com números e paradas seguras em "Mais/Menos"
                        let matchConfronto = textoSemData.match(/(.+?)\s+x\s+(.+?)(\d+)(Mais|Menos)/i);
                        if (!matchConfronto) {
                            matchConfronto = textoSemData.match(/(.+?)\s+x\s+([^0-9]+)(\d+)/);
                        }
                        
                        if (matchConfronto) {
                            let timeA = matchConfronto[1].trim();
                            const timeB = matchConfronto[2].trim();
                            const cantosTotal = parseInt(matchConfronto[3], 10);

                            timeA = timeA
                                .replace(/^(domingo|segunda-feira|terça-feira|quarta-feira|quinta-feira|sexta-feira|sábado|hoje|amanhã),?/i, '')
                                .replace(/^\s*\d*\s*de\s*[a-z]+\s*de\s*\d{4}/i, '')
                                .trim();

                            const confrontoLimpo = `${timeA} x ${timeB}`;
                            const chaveJogo = `${confrontoLimpo.toLowerCase()}_${ligaAtual.toLowerCase()}`;

                            if (jogosProcessadosNestaRodada.has(chaveJogo)) return;
                            jogosProcessadosNestaRodada.add(chaveJogo);

                            totalAnalisados++;

                            // CRITÉRIO: Média de escanteios totais estritamente MAIOR que 10 (mínimo 11)
                            if (cantosTotal > 10) {
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
        });

        console.log(`[VARREDURA CONCLUÍDA]`);
        console.log(`>> Total de jogos de HOJE mapeados: ${totalAnalisados}`);
        console.log(`>> Alertas enviados nesta rodada: ${totalDisparados}`);
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
