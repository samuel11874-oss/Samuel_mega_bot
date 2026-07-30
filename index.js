const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V30 Gols ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Ligas Principais
const TOP_LIGAS = [
    'brasil', 'brazil', 'brasileiro', 'serie a', 'serie b', 'copa do brasil', 'paulista', 'carioca',
    'libertadores', 'sudamericana', 'sul-americana', 'argentina', 'colombia', 'chile', 'uruguay', 'paraguay',
    'champions', 'europa league', 'conference league', 'premier league', 'england', 'la liga', 'spain',
    'italy', 'bundesliga', 'germany', 'ligue 1', 'france', 'portugal', 'eredivisie'
];

// Termos Proibidos (Base e Amadores)
const TERMOS_PROIBIDOS = [
    'sub 17', 'sub 18', 'sub 19', 'sub 20', 'sub 21', 'sub 23',
    'sub-17', 'sub-18', 'sub-19', 'sub-20', 'sub-21', 'sub-23',
    'u17', 'u18', 'u19', 'u20', 'u21', 'u23',
    'youth', 'juniors', 'junior', 'júniores', 'juniores',
    'amateur', 'amador', 'reserves', 'reservas', 'academy', 'academica'
];

async function executarRadarV30() {
    let browser = null;
    try {
        console.log("📊 [Bot V30] Buscando partidas e extraindo Linhas de Gols reais...");

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

        await page.waitForSelector('a[href*="/team/"]', { timeout: 15000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 2000));

        // Extração direta da tabela principal
        const jogosProcessados = await page.evaluate((ligasFiltro, proibidos) => {
            const lista = [];
            const trs = Array.from(document.querySelectorAll('tr'));

            trs.forEach(tr => {
                const teamLinks = Array.from(tr.querySelectorAll('a[href*="/team/"]'));
                if (teamLinks.length < 2) return;

                const timeA = teamLinks[0].innerText.trim();
                const timeB = teamLinks[1].innerText.trim();

                if (!timeA || !timeB || timeA.length < 2 || timeB.length < 2) return;

                // Horário
                const textoLinha = tr.innerText || '';
                const horaMatch = textoLinha.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/);
                const horaJogo = horaMatch ? horaMatch[0] : 'Hoje';

                // Liga
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
                const contexto = (timeA + ' ' + timeB + ' ' + ligaNome + ' ' + textoLinha).toLowerCase();

                // Filtro Anti-Base/Amador
                if (proibidos.some(termo => contexto.includes(termo))) return;

                // Filtro de Ligas Principais
                if (!ligasFiltro.some(l => contexto.includes(l))) return;

                // EXTRAÇÃO REAIS DA LINHA DE GOLS
                let golLinha = "Linha Não Definida Pré-Jogo";

                // Procura na coluna específica de Goal Line ou varre as células da linha
                const tds = Array.from(tr.querySelectorAll('td'));
                const tdsText = tds.map(td => td.innerText.trim());

                for (const txt of tdsText) {
                    // Detecta padrões de linhas de gols do TotalCorner (ex: 1.5, 2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5)
                    if (/^(?:1|2|3|4)\.(?:0|25|5|75)$/.test(txt) || /^(?:1|2|3|4)\.(?:0|5)\/(?:2|3|4)\.(?:0|5)$/.test(txt)) {
                        const num = parseFloat(txt);
                        if (num >= 1.5 && num <= 4.5) {
                            golLinha = `${txt} Gols (Linha O/U)`;
                            break;
                        }
                    }
                }

                lista.push({
                    timeA: timeA,
                    timeB: timeB,
                    hora: horaJogo,
                    liga: ligaNome,
                    gols: golLinha
                });
            });

            // Deduplicação
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

        console.log(`⚽ [Bot V30] Partidas com dados reais de Gols processadas: ${jogosProcessados.length}`);

        if (jogosProcessados.length > 0) {
            let headerMsg = `🎯 <b>[ RADAR PRO // LINHAS DE GOLS REAIS ]</b> ⚽\n`;
            headerMsg += `────────────────────────\n`;
            headerMsg += `📊 <b>Jogos Selecionados:</b> <code>${jogosProcessados.length}</code>\n`;
            headerMsg += `⚡ <i>Linhas de Gols Over/Under do TotalCorner</i>\n`;
            headerMsg += `────────────────────────`;

            await bot.sendMessage(CHAT_ID, headerMsg, { parse_mode: 'HTML' }).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));

            let enviados = 0;

            for (let i = 0; i < jogosProcessados.length; i++) {
                const j = jogosProcessados[i];
                enviados++;

                let card = `⚽ <b>INFORMAÇÕES DA PARTIDA ENCONTRADA #${enviados}</b>\n`;
                card += `────────────────────────\n`;
                card += `🏆 <b>Liga:</b> <code>${j.liga}</code>\n`;
                card += `⏰ <b>Horário:</b> <code>${j.hora}</code>\n\n`;
                card += `🏠 <b>${j.timeA}</b>\n`;
                card += `   <b>VS</b>\n`;
                card += `✈️ <b>${j.timeB}</b>\n`;
                card += `────────────────────────\n`;
                card += `⚽ <b>Linha / Média de Gols:</b> <code>${j.gols}</code>\n`;
                card += `────────────────────────\n`;
                card += `🤖 <i>Samuel Mega Bot • V30 Foco em Gols</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 700));
            }

            console.log(`✅ ${enviados} cards de gols entregues com sucesso no Telegram!`);
        } else {
            console.log("⚠️ Nenhuma partida filtrada nesta rodada.");
        }

    } catch (error) {
        console.error("❌ Erro no Radar V30:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

setInterval(executarRadarV30, 1800000);
executarRadarV30();
