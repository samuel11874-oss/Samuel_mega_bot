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

function obterDataSaoPaulo() {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric', month: 'numeric', day: 'numeric'
    });
    const partes = formatter.formatToParts(new Date());
    const dataSP = {};
    partes.forEach(({type, value}) => { dataSP[type] = value; });
    return {
        ano: parseInt(dataSP.year, 10),
        mes: parseInt(dataSP.month, 10),
        dia: parseInt(dataSP.day, 10)
    };
}

function obterAmanhaSaoPaulo() {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric', month: 'numeric', day: 'numeric'
    });
    const partes = formatter.formatToParts(amanha);
    const dataSP = {};
    partes.forEach(({type, value}) => { dataSP[type] = value; });
    return {
        ano: parseInt(dataSP.year, 10),
        mes: parseInt(dataSP.month, 10),
        dia: parseInt(dataSP.day, 10)
    };
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

function ehJogoDeHoje(textoOriginal, liga) {
    const t = textoOriginal.toLowerCase();
    const ligaMinusc = liga.toLowerCase();
    
    if (t.includes('hoje')) return true;
    
    const ehLigaSulAmericana = ligaMinusc.includes('brasil') || 
                               ligaMinusc.includes('série') || 
                               ligaMinusc.includes('paulista') || 
                               ligaMinusc.includes('carioca') || 
                               ligaMinusc.includes('gaúcho') || 
                               ligaMinusc.includes('mineiro') || 
                               ligaMinusc.includes('copa') ||
                               ligaMinusc.includes('sudamericana') ||
                               ligaMinusc.includes('libertadores') ||
                               ligaMinusc.includes('argentina') ||
                               ligaMinusc.includes('colômbia') ||
                               ligaMinusc.includes('chile');

    if (t.includes('amanhã') && ehLigaSulAmericana) return true;

    const { dia: hojeDia, mes: hojeMes } = obterDataSaoPaulo();
    const { dia: amanhaDia, mes: amanhaMes } = obterAmanhaSaoPaulo();

    const mesesPT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const nomeMesHoje = mesesPT[hojeMes - 1];
    const nomeMesAmanha = mesesPT[amanhaMes - 1];

    const matchesHoje = (
        (t.includes(hojeDia.toString()) && (t.includes(nomeMesHoje) || t.includes(nomeMesHoje.substring(0, 3)))) ||
        t.includes(`${hojeDia}/${hojeMes}`) ||
        t.includes(`${hojeDia}/0${hojeMes}`) ||
        t.includes(`0${hojeDia}/${hojeMes}`) ||
        t.includes(`0${hojeDia}/0${hojeMes}`)
    );

    if (matchesHoje) return true;

    if (ehLigaSulAmericana) {
        const matchesAmanha = (
            (t.includes(amanhaDia.toString()) && (t.includes(nomeMesAmanha) || t.includes(nomeMesAmanha.substring(0, 3)))) ||
            t.includes(`${amanhaDia}/${amanhaMes}`) ||
            t.includes(`${amanhaDia}/0${amanhaMes}`) ||
            t.includes(`0${amanhaDia}/${amanhaMes}`) ||
            t.includes(`0${amanhaDia}/0${amanhaMes}`)
        );
        if (matchesAmanha) return true;
    }

    return false;
}

async function monitorarJogos() {
    try {
        console.log("--------------------------------------------------");
        console.log("[MONITORANDO JOGOS] Varrendo todas as ligas do WinDrawWin...");

        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS, timeout: 15000 });
        const $ = cheerio.load(data);

        let totalAnalisados = 0;
        let totalDisparados = 0;
        let ligaAtual = "Liga Não Identificada";

        cacheJogos = carregarCache();
        const jogosProcessadosNestaRodada = new Set();

        // Regex para extrair "Quinta-feira, 16 de Julho" ou qualquer variação no início da linha
        const regexPrefixoData = /^(hoje|amanhã|domingo|segunda-feira|terça-feira|quarta-feira|quinta-feira|sexta-feira|sábado)(?:,\s*\d+(?:\s+de\s+[a-zà-ú]+)?(?:\s+de\s+\d{4})?)?/i;

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
                    if (ehJogoDeHoje(textoLimpo, ligaAtual)) {
                        
                        // Remove completamente o prefixo de data do início do texto
                        const textoSemData = textoLimpo.replace(regexPrefixoData, '').trim();

                        // Captura os times e a média de escanteios (com decimais, ignorando textos residuais no fim)
                        const matchConfronto = textoSemData.match(/(.+?)\s+x\s+(.+?)\s+(\d+(?:\.\d+)?)(?:\D*)$/);
                        
                        if (matchConfronto) {
                            const timeA = matchConfronto[1].trim();
                            const timeB = matchConfronto[2].trim();
                            const cantosTotal = parseFloat(matchConfronto[3]);

                            const confrontoLimpo = `${timeA} x ${timeB}`;
                            const chaveJogo = `${confrontoLimpo.toLowerCase()}_${ligaAtual.toLowerCase()}`;

                            if (jogosProcessadosNestaRodada.has(chaveJogo)) return;
                            jogosProcessadosNestaRodada.add(chaveJogo);

                            totalAnalisados++;

                            // NOVO CRITÉRIO: Média estritamente maior que 10 escanteios (> 10)
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
