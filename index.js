const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar Profissional V24 🎯</h2>'));
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

async function executarRadarV24() {
    let browser = null;
    try {
        console.log("🎯 [Bot V24] Executando varredura com filtro estrito Profissional/Adulto...");

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
            console.log("⚠️ Aguardando renderização do DOM...");
        });

        await new Promise(r => setTimeout(r, 3000));

        const jogosFiltrados = await page.evaluate((ligasFiltro, proibidos) => {
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

                // 1. BLOQUEIO DE JOGOS DA BASE / AMADORES
                const eProibido = proibidos.some(termo => contextoCompleto.includes(termo));
                if (eProibido) return;

                // 2. FILTRO DE LIGAS PRINCIPAIS
                const eTop = ligasFiltro.some(l => contextoCompleto.includes(l));

                if (eTop) {
                    lista.push({
                        timeA: timeA,
                        timeB: timeB,
                        hora: horaJogo,
                        liga: ligaNome
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

        console.log(`⚽ [Bot V24] Partidas PROFISSIONAIS de elite encontradas: ${jogosFiltrados.length}`);

        if (jogosFiltrados.length > 0) {
            // Header do Relatório
            let headerMsg = `🎯 <b>[ RADAR PRO // FUTEBOL PROFISSIONAL ]</b> 💎\n`;
            headerMsg += `────────────────────────\n`;
            headerMsg += `📊 <b>Jogos Selecionados:</b> <code>${jogosFiltrados.length}</code>\n`;
            headerMsg += `🛡️ <i>Filtro Ativo: Sem Sub-20/Amadores</i>\n`;
            headerMsg += `────────────────────────`;

            await bot.sendMessage(CHAT_ID, headerMsg, { parse_mode: 'HTML' }).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));

            let enviados = 0;

            for (let i = 0; i < jogosFiltrados.length; i++) {
                const j = jogosFiltrados[i];
                enviados++;

                // DESIGN MODERNO DO CARD NO TELEGRAM
                let card = `⚽ <b>CONFRONTO #${enviados}</b>\n`;
                card += `────────────────────────\n`;
                card += `🏆 <b>Liga:</b> <code>${j.liga}</code>\n`;
                card += `⏰ <b>Horário:</b> <code>${j.hora}</code>\n\n`;
                card += `🏠 <b>${j.timeA}</b>\n`;
                card += `   <b>VS</b>\n`;
                card += `✈️ <b>${j.timeB}</b>\n`;
                card += `────────────────────────\n`;
                card += `🤖 <i>Samuel Mega Bot • Pro V24</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 700));
            }

            console.log(`✅ ${enviados} cards profissionais enviados ao Telegram com sucesso!`);
        } else {
            console.log("⚠️ Nenhuma partida profissional filtrada para envio nesta rodada.");
        }

    } catch (error) {
        console.error("❌ Erro no Radar V24:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

// Executa a cada 30 minutos
setInterval(executarRadarV24, 1800000);
executarRadarV24();
