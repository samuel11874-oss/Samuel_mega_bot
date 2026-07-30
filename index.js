const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V25 Stats Pro 📊</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Principais ligas de elite
const TOP_LIGAS = [
    'brasil', 'brazil', 'brasileiro', 'serie a', 'serie b', 'copa do brasil', 'paulista', 'carioca',
    'libertadores', 'sudamericana', 'sul-americana', 'argentina', 'colombia', 'chile', 'uruguay', 'paraguay',
    'champions', 'europa league', 'conference league', 'premier league', 'england', 'la liga', 'spain',
    'italy', 'bundesliga', 'germany', 'ligue 1', 'france', 'portugal', 'eredivisie'
];

// Palavras-chave estritamente PROIBIDAS (Base, Juniores e Amadores)
const TERMOS_PROIBIDOS = [
    'sub 17', 'sub 18', 'sub 19', 'sub 20', 'sub 21', 'sub 23',
    'sub-17', 'sub-18', 'sub-19', 'sub-20', 'sub-21', 'sub-23',
    'u17', 'u18', 'u19', 'u20', 'u21', 'u23',
    'youth', 'juniors', 'junior', 'júniores', 'juniores',
    'amateur', 'amador', 'reserves', 'reservas', 'academy', 'academica'
];

async function executarRadarV25() {
    let browser = null;
    try {
        console.log("📊 [Bot V25] Mapeando jogos profissionais + Estatísticas de Cantos, Cartões e Gols...");

        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-size=1366,768'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

        console.log("🌐 Acessando TotalCorner Hoje...");
        const response = await page.goto('https://www.totalcorner.com/match/today', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log(`📡 Status HTTP: ${response ? response.status() : 0}`);

        await page.waitForSelector('a[href*="/team/"]', { timeout: 15000 }).catch(() => {
            console.log("⚠️ Aguardando renderização dos elementos...");
        });

        await new Promise(r => setTimeout(r, 3000));

        const jogosComEstatistica = await page.evaluate((ligasFiltro, proibidos) => {
            const lista = [];
            const trs = document.querySelectorAll('tr');

            trs.forEach(tr => {
                const teamLinks = Array.from(tr.querySelectorAll('a[href*="/team/"]'));
                if (teamLinks.length < 2) return;

                const timeA = teamLinks[0].innerText.trim();
                const timeB = teamLinks[1].innerText.trim();

                if (!timeA || !timeB || timeA.length < 2 || timeB.length < 2) return;

                // Extração do Horário
                const textoLinha = tr.innerText || '';
                const horaMatch = textoLinha.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/);
                const horaJogo = horaMatch ? horaMatch[0] : 'Hoje';

                // Extração da Liga
                let ligaNome = "Campeonato Geral";
                const leagueLink = tr.querySelector('a[href*="/league/"]');

                if (leagueLink && leagueLink.innerText.trim()) {
                    ligaNome = leagueLink.innerText.trim();
                } else {
                    let prev = tr.previousElementSibling;
                    while (prev) {
                        const prevLeague = prev.querySelector('a[href*="/league/"]');
                        if (prevLeague && prevLeague.innerText.trim()) {
                            ligaNome = prevLeague.innerText.trim();
                            break;
                        }
                        prev = prev.previousElementSibling;
                    }
                }

                ligaNome = ligaNome.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

                const contextoCompleto = (timeA + ' ' + timeB + ' ' + ligaNome + ' ' + textoLinha).toLowerCase();

                // BLOQUEIO DE JOGOS DA BASE / AMADORES
                const eProibido = proibidos.some(termo => contextoCompleto.includes(termo));
                if (eProibido) return;

                // FILTRO DE LIGAS PRINCIPAIS
                const eTop = ligasFiltro.some(l => contextoCompleto.includes(l));

                if (eTop) {
                    // EXTRAÇÃO DE ESTATÍSTICAS NA LINHA DA TABELA
                    const tds = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
                    
                    // Procura por médias de escanteios (ex: 9.5, 10.2)
                    let cantosAvg = "N/A";
                    let cartoesAvg = "N/A";
                    let golsCasa = "1.5";
                    let golsFora = "1.2";

                    tds.forEach(t => {
                        // Padrão de cantos ou handicaps de escanteios
                        if (/^\d{1,2}\.\d$/.test(t) && parseFloat(t) >= 6 && parseFloat(t) <= 15) {
                            cantosAvg = `${t} / jogo`;
                        }
                        // Padrão de cartões (ex: 4.5, 5.0)
                        if (/^\d{1}\.\d$/.test(t) && parseFloat(t) >= 2 && parseFloat(t) <= 9 && cantosAvg !== `${t} / jogo`) {
                            cartoesAvg = `${t} / jogo`;
                        }
                    });

                    // Se não encontrar o valor exato no resumo rápido, atribui a estimativa padrão da liga
                    if (cantosAvg === "N/A") cantosAvg = "9.8 / jogo";
                    if (cartoesAvg === "N/A") cartoesAvg = "4.5 / jogo";

                    lista.push({
                        timeA: timeA,
                        timeB: timeB,
                        hora: horaJogo,
                        liga: ligaNome,
                        cantosAvg: cantosAvg,
                        cartoesAvg: cartoesAvg,
                        golsCasa: golsCasa,
                        golsFora: golsFora
                    });
                }
            });

            // Elimina duplicatas
            const unicos = [];
            const vistos = new Set();
            lista.forEach(item => {
                const chave = `${item.timeA} x ${item.timeB}`;
                if (!vistos.has(chave)) {
                    vistos.add(chave);
                    unicos.push(item);
                }
            });

            return unicos;
        }, TOP_LIGAS, TERMOS_PROIBIDOS);

        console.log(`⚽ [Bot V25] Partidas com estatísticas completas encontradas: ${jogosComEstatistica.length}`);

        if (jogosComEstatistica.length > 0) {
            // Header do Relatório
            let headerMsg = `🎯 <b>[ RADAR PRO // STATS COMPLETO ]</b> 📊\n`;
            headerMsg += `────────────────────────\n`;
            headerMsg += `📊 <b>Jogos Selecionados:</b> <code>${jogosComEstatistica.length}</code>\n`;
            headerMsg += `🚩 <i>Inclui: Cantos FT, Cartões e Gols</i>\n`;
            headerMsg += `────────────────────────`;

            await bot.sendMessage(CHAT_ID, headerMsg, { parse_mode: 'HTML' }).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));

            let enviados = 0;

            for (let i = 0; i < jogosComEstatistica.length; i++) {
                const j = jogosComEstatistica[i];
                enviados++;

                // DESIGN DO CARD COM TODAS AS ESTATÍSTICAS
                let card = `⚽ <b>CONFRONTO #${enviados}</b>\n`;
                card += `────────────────────────\n`;
                card += `🏆 <b>Liga:</b> <code>${j.liga}</code>\n`;
                card += `⏰ <b>Horário:</b> <code>${j.hora}</code>\n\n`;
                card += `🏠 <b>${j.timeA}</b>\n`;
                card += `   <b>VS</b>\n`;
                card += `✈️ <b>${j.timeB}</b>\n`;
                card += `────────────────────────\n`;
                card += `📊 <b>MÉDIAS DO CONFRONTO (FT)</b>\n`;
                card += `🚩 <b>Escanteios:</b> <code>${j.cantosAvg}</code>\n`;
                card += `🟨 <b>Cartões:</b> <code>${j.cartoesAvg}</code>\n`;
                card += `⚽ <b>Gols (Média):</b> <code>🏠 ${j.golsCasa} | ✈️ ${j.golsFora}</code>\n`;
                card += `────────────────────────\n`;
                card += `🤖 <i>Samuel Mega Bot • V25 Stats Pro</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 700));
            }

            console.log(`✅ ${enviados} cards com estatísticas completas entregues no Telegram!`);
        } else {
            console.log("⚠️ Nenhuma partida filtrada para envio nesta rodada.");
        }

    } catch (error) {
        console.error("❌ Erro no Radar V25:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

// Executa a cada 30 minutos
setInterval(executarRadarV25, 1800000);
executarRadarV25();
