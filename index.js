const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Operacional com Modo Investigação 🛡️</h2><p>WinDrawWin + Football-Data + Overlyzer</p>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

let jogosEnviados = new Set();

function getBandeira(teamName) {
    const list = {
        "Flamengo": "🇧🇷", "Palmeiras": "🇧🇷", "Corinthians": "🇧🇷", "São Paulo": "🇧🇷",
        "Santos": "🇧🇷", "Cruzeiro": "🇧🇷", "Atlético": "🇧🇷", "Bahia": "🇧🇷",
        "Vasco": "🇧🇷", "Botafogo": "🇧🇷", "Fluminense": "🇧🇷", "Grêmio": "🇧🇷",
        "Internacional": "🇧🇷", "Arsenal": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Chelsea": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Liverpool": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", 
        "Manchester City": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Real Madrid": "🇪🇸", "Barcelona": "🇪🇸", "Juventus": "🇮🇹"
    };
    return list[teamName] || "⚽";
}

// Função de Alerta Interno para o Desenvolvedor (caso uma fonte falhe criticamente)
function registrarAlertaInvestigacao(fonte, erro) {
    const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    console.warn(`⚠️ [MODO INVESTIGAÇÃO] Falha detectada na fonte [${fonte}] em ${timestamp}:`);
    console.warn(`-> Detalhe do erro: ${erro.message || erro}`);
    console.warn(`-> O bot continua rodando normalmente pelas outras fontes ativas.`);
}

// 1. WIN-DRAW-WIN (Com investigação de falhas)
async function buscarWinDrawWin() {
    try {
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS }).catch(err => {
            throw new Error(`Erro HTTP/Conexão: ${err.response ? err.response.status : err.message}`);
        });

        if (!response || !response.data) {
            throw new Error("A página retornou vazia ou o layout mudou.");
        }

        const $ = cheerio.load(response.data);
        let encontrados = 0;
        const hojeStr = new Date().toLocaleDateString('pt-BR');

        $('div, tr').each((i, el) => {
            const texto = $(el).text().trim();
            if (/amanhã|ontem/i.test(texto)) return;

            if (texto.includes(' x ') && /\d[.,]\d/.test(texto)) {
                const linhaLimpa = texto.replace(/hoje|amanhã|tomorrow|data/gi, '').trim();
                const match = linhaLimpa.match(/([A-Za-zÀ-ÿ\s]{3,})\s?x\s?([A-Za-zÀ-ÿ\s]{3,})/i);
                const numeros = linhaLimpa.match(/(\d{1,2}[.,]\d)/g);
                
                if (match && numeros && numeros.length >= 2) {
                    const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                    
                    if (media > 10.5 && media <= 18.0) {
                        const t1 = match[1].trim();
                        const t2 = match[2].trim();
                        const chave = `wdw_${t1}_${t2}`.toLowerCase().replace(/\s/g, '');
                        
                        if (!jogosEnviados.has(chave)) {
                            jogosEnviados.add(chave);
                            encontrados++;

                            const bandeira = getBandeira(t1);
                            const msg = `⚽ *Oportunidade WinDrawWin (> 10.5 FT)*\n\n` +
                                        `${bandeira} *${t1} x ${t2}*\n` +
                                        `📅 Data: Hoje (${hojeStr})\n` +
                                        `⛳ *Média FT: ${media.toFixed(1)}*`;
                            
                            bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                            console.log(`✅ [WinDrawWin] Enviado: ${t1} x ${t2}`);
                        }
                    }
                }
            }
        });
        console.log(`🔍 [WinDrawWin] Varredura OK. Jogos enviados: ${encontrados}`);
    } catch (e) {
        registrarAlertaInvestigacao("WinDrawWin", e);
    }
}

// 2. FOOTBALL-DATA.CO.UK (Com investigação de falhas)
async function buscarFootballDataCSV() {
    try {
        const ligas = ['E0', 'SP1', 'I1', 'D1', 'F1'];
        const hojeObj = new Date();
        const dia = String(hojeObj.getDate()).padStart(2, '0');
        const mes = String(hojeObj.getMonth() + 1).padStart(2, '0');
        const ano = hojeObj.getFullYear().toString().slice(-2);
        const temporada = '2526';

        for (const liga of ligas) {
            const csvUrl = `https://www.football-data.co.uk/mmz4281/${temporada}/${liga}.csv`;
            const response = await axios.get(csvUrl, { headers: HEADERS }).catch(() => null);
            
            if (!response || !response.data) {
                console.warn(`⚠️ [Football-Data] CSV da liga ${liga} indisponível no momento.`);
                continue;
            }

            const linhas = response.data.split('\n');
            if (linhas.length < 2) continue;

            const cabecalho = linhas[0].split(',');
            const idxDate = cabecalho.indexOf('Date');
            const idxHome = cabecalho.indexOf('HomeTeam');
            const idxAway = cabecalho.indexOf('AwayTeam');
            const idxHC = cabecalho.indexOf('HC');
            const idxAC = cabecalho.indexOf('AC');

            if (idxDate === -1 || idxHome === -1 || idxAway === -1) continue;

            for (let i = 1; i < linhas.length; i++) {
                if (!linhas[i].trim()) continue;
                const colunas = linhas[i].split(',');
                const dataJogo = colunas[idxDate]; 

                if (dataJogo && (dataJogo === `${dia}/${mes}/${ano}` || dataJogo === `${dia}/${mes}/20${ano}` || dataJogo.startsWith(`${dia}/${mes}`))) {
                    const t1 = colunas[idxHome];
                    const t2 = colunas[idxAway];
                    
                    let mediaCSV = 0;
                    if (idxHC !== -1 && idxAC !== -1 && colunas[idxHC] && colunas[idxAC]) {
                        mediaCSV = (parseFloat(colunas[idxHC]) || 0) + (parseFloat(colunas[idxAC]) || 0);
                    }

                    if (mediaCSV > 10.5) {
                        const chave = `csv_${t1}_${t2}`.toLowerCase().replace(/\s/g, '');

                        if (!jogosEnviados.has(chave)) {
                            jogosEnviados.add(chave);
                            const bandeira = getBandeira(t1);

                            const msg = `📊 *Dataset Football-Data (> 10.5 FT)*\n\n` +
                                        `${bandeira} *${t1} x ${t2}*\n` +
                                        `📅 Data: ${dataJogo}\n` +
                                        `⛳ *Escanteios Registrados: ${mediaCSV}*`;

                            bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                            console.log(`✅ [Football-Data CSV] Enviado: ${t1} x ${t2}`);
                        }
                    }
                }
            }
        }
    } catch (e) {
        registrarAlertaInvestigacao("Football-Data.co.uk", e);
    }
}

// 3. OVERLYZER (Com investigação de falhas)
async function buscarOverlyzer() {
    try {
        const response = await axios.get('https://overlyzer.com/br/', { headers: HEADERS }).catch(err => {
            throw new Error(`Erro de acesso/Bloqueio: ${err.message}`);
        });

        if (!response || !response.data) return;

        const $ = cheerio.load(response.data);
        let encontrados = 0;

        $('div, tr').each((i, el) => {
            const texto = $(el).text().trim();
            if (texto.includes(' x ') && /pressão|ataque/i.test(texto)) {
                const chave = `ovl_${texto.substring(0, 30)}`.toLowerCase().replace(/\s/g, '');
                
                if (!jogosEnviados.has(chave)) {
                    jogosEnviados.add(chave);
                    encontrados++;

                    const msg = `⚡ *Alerta Overlyzer (Pressão Ao Vivo)*\n\n` +
                                `📈 ${texto.substring(0, 120)}`;
                    
                    bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                    console.log(`✅ [Overlyzer] Alerta enviado.`);
                }
            }
        });
    } catch (e) {
        registrarAlertaInvestigacao("Overlyzer", e);
    }
}

// Limpa cache a cada 1 hora
setInterval(() => { jogosEnviados.clear(); }, 3600000);

// Executa todas as fontes a cada 5 minutos
setInterval(() => {
    buscarWinDrawWin();
    buscarFootballDataCSV();
    buscarOverlyzer();
}, 300000);

// Execução inicial imediata ao ligar
buscarWinDrawWin();
buscarFootballDataCSV();
buscarOverlyzer();
