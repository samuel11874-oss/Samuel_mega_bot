const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const app = WebService = express();
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

// --- SISTEMA DE ARQUIVO FÍSICO COM VALIDADE DE 3 DIAS PARA EVITAR DUPLICADOS ---
const CACHE_FILE = path.join(__dirname, 'jogos_enviados.json');
let cacheJogos = carregarCache();

function carregarCache() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const dados = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
            const agora = Date.now();
            const cacheLimpo = {};
            // Mantém no cache apenas jogos enviados nos últimos 3 dias
            for (const [chave, ts] of Object.entries(dados)) {
                if (agora - ts < 3 * 24 * 60 * 60 * 1000) {
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

async function monitorarJogos() {
    try {
        console.log("--------------------------------------------------");
        console.log("[MONITORANDO JOGOS] Varrendo todas as ligas do WinDrawWin...");

        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS, timeout: 15000 });
        const $ = cheerio.load(data);

        let totalAnalisados = 0;
        let totalDisparados = 0;
        let ligaAtual = "Liga Não Identificada";

        // Recarrega o cache persistente
        cacheJogos = carregarCache();

        // Evita duplicar a mesma linha de HTML na mesma varredura
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

                    // Regex para separar data, times e escanteios
                    const regexData = /^(domingo|segunda-feira|terça-feira|quarta-feira|quinta-feira|sexta-feira|sábado|hoje|amanhã)(?:,\s*\d+\s+de\s+[a-z]+\s+de\s+\d{4})?/i;
                    const matchData = textoLimpo.match(regexData);
                    
                    let dataJogo = "Não identificada";
                    let textoSemData = textoLimpo;

                    if (matchData) {
                        dataJogo = matchData[0].trim();
                        textoSemData = textoLimpo.substring(dataJogo.length).trim();
                    }

                    const matchConfronto = textoSemData.match(/(.+?)\s+x\s+([^0-9]+)(\d+)/);
                    
                    if (matchConfronto) {
                        const timeA = matchConfronto[1].trim();
                        const timeB = matchConfronto[2].trim();
                        const cantosTotal = parseInt(matchConfronto[3], 10);

                        // Limpeza das datas residuais grudadas no time A
                        const timeALimpo = timeA
                            .replace(/^(domingo|segunda-feira|terça-feira|quarta-feira|quinta-feira|sexta-feira|sábado|hoje|amanhã),?/i, '')
                            .replace(/^\s*\d*\s*de\s*[a-z]+\s*de\s*\d{4}/i, '')
                            .trim();

                        const confrontoLimpo = `${timeALimpo} x ${timeB}`;
                        const chaveJogo = `${confrontoLimpo.toLowerCase()}_${ligaAtual.toLowerCase()}`;

                        // PREVENÇÃO DE DUPLICIDADE: Pula se já processamos esse exato jogo nesta varredura
                        if (jogosProcessadosNestaRodada.has(chaveJogo)) {
                            return;
                        }
                        jogosProcessadosNestaRodada.add(chaveJogo);

                        totalAnalisados++;

                        // CRITÉRIO: Média acima de 10.5 cantos (Mínimo de 11 total)
                        if (cantosTotal > 10.5) {
                            
                            // Validação de duplicados persistente entre as horas
                            if (cacheJogos[chaveJogo]) {
                                console.log(`[IGNORADO - JÁ ENVIADO ANTERIORMENTE] ${confrontoLimpo}`);
                            } else {
                                enviarAlerta(ligaAtual, confrontoLimpo, cantosTotal, dataJogo);
                                cacheJogos[chaveJogo] = Date.now();
                                salvarCache();
                                totalDisparados++;
                            }
                        }
                    }
                }
            }
        });

        console.log(`[VARREDURA CONCLUÍDA]`);
        console.log(`>> Total de jogos mapeados: ${totalAnalisados}`);
        console.log(`>> Alertas enviados nesta rodada: ${totalDisparados}`);
        console.log("--------------------------------------------------");

    } catch (e) {
        console.error("Erro no monitoramento:", e.message);
    }
}

function enviarAlerta(liga, confronto, cantos, dataJogo) {
    const mensagem = `
🔥 *Palpites do dia para seu bilhete*

⚽ *Jogo:* ${confronto}
🌍 *Liga:* ${liga}
📅 *Data:* ${dataJogo}
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
