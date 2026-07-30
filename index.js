const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Agenda V23 🎯</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Lista das principais ligas do Brasil, América do Sul e Europa
const TOP_LIGAS = [
    'brasil', 'brazil', 'brasileiro', 'serie a', 'serie b', 'copa do brasil', 'paulista', 'carioca',
    'libertadores', 'sudamericana', 'sul-americana', 'argentina', 'colombia', 'chile', 'uruguay', 'paraguay',
    'champions', 'europa league', 'conference league', 'premier league', 'england', 'la liga', 'spain',
    'italy', 'bundesliga', 'germany', 'ligue 1', 'france', 'portugal', 'eredivisie'
];

async function executarAgendaV23() {
    let browser = null;
    try {
        console.log("🎯 [Bot V23] Capturando times via links de equipe (/team/)...");

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

        // Garante que o JavaScript do site terminou de renderizar os times na tela
        await page.waitForSelector('a[href*="/team/"]', { timeout: 15000 }).catch(() => {
            console.log("⚠️ Tempo limite de espera pelo seletor de times atingido.");
        });

        await new Promise(r => setTimeout(r, 3000));

        const jogosLimpos = await page.evaluate((ligasFiltro) => {
            const lista = [];
            const trs = document.querySelectorAll('tr');

            trs.forEach(tr => {
                // No TotalCorner, os links dos dois times SEMPRE possuem "/team/" no href
                const teamLinks = Array.from(tr.querySelectorAll('a[href*="/team/"]'));
                if (teamLinks.length < 2) return;

                const timeA = teamLinks[0].innerText.trim();
                const timeB = teamLinks[1].innerText.trim();

                if (!timeA || !timeB || timeA.length < 2 || timeB.length < 2) return;

                // Extração do Horário
                const textoLinha = tr.innerText || '';
                const horaMatch = textoLinha.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/);
                const horaJogo = horaMatch ? horaMatch[0] : 'Hoje';

                // Extração da Liga (links com "/league/" no href)
                let ligaNome = "Campeonato Geral";
                const leagueLink = tr.querySelector('a[href*="/league/"]');

                if (leagueLink && leagueLink.innerText.trim()) {
                    ligaNome = leagueLink.innerText.trim();
                } else {
                    // Fallback para buscar a liga na linha de cabeçalho anterior
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

                // Filtro de Top Ligas
                const contextoLower = (textoLinha + ' ' + ligaNome).toLowerCase();
                const eTop = ligasFiltro.some(l => contextoLower.includes(l));

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
        }, TOP_LIGAS);

        console.log(`⚽ [Bot V23] Total de confrontos com times capturados: ${jogosLimpos.length}`);

        if (jogosLimpos.length > 0) {
            let headerMsg = `🏆 <b>[ AGENDA DE ELITE // HOJE ]</b> 🏆\n`;
            headerMsg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
            headerMsg += `📊 <b>Confrontos Identificados:</b> <code>${jogosLimpos.length}</code>\n`;
            headerMsg += `🎯 <i>Extração Exata por Links de Equipes</i>\n`;
            headerMsg += `━━━━━━━━━━━━━━━━━━━━━━`;

            await bot.sendMessage(CHAT_ID, headerMsg, { parse_mode: 'HTML' }).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));

            let enviados = 0;

            for (let i = 0; i < jogosLimpos.length; i++) {
                const j = jogosLimpos[i];
                enviados++;

                let card = `📌 <b>PARTIDA #${enviados}</b>\n`;
                card += `🏆 <b>Liga:</b> <code>${j.liga}</code>\n`;
                card += `⏰ <b>Horário:</b> <code>${j.hora}</code>\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `⚽ <b>CONFRONTO:</b>\n`;
                card += `  🏠 <b>${j.timeA}</b>\n`;
                card += `  ✈️ <b>${j.timeB}</b>\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `🤖 <i>Samuel Mega Bot • V23 Perfeita</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 700));
            }

            console.log(`✅ ${enviados} cards perfeitos entregues no Telegram com sucesso!`);
        } else {
            console.log("⚠️ Nenhum confronto com times válidos foi capturado nesta rodada.");
        }

    } catch (error) {
        console.error("❌ Erro no Radar V23:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

setInterval(executarAgendaV23, 1800000);
executarAgendaV23();
