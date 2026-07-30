const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Agenda VIP V22 🏆</h2>'));
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

async function executarAgendaV22() {
    let browser = null;
    try {
        console.log("🎯 [Bot V22 - VIP] Extração cirúrgica com separação exata de Times e Ligas...");

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
        await new Promise(r => setTimeout(r, 5000));

        const jogosLimpos = await page.evaluate((ligasFiltro) => {
            const lista = [];
            const trs = document.querySelectorAll('tr[id^="tr_match_"], tr');

            trs.forEach(tr => {
                // Seleção isolada dos elementos no HTML do TotalCorner
                const homeEl = tr.querySelector('.match_home a, .match_home, td.home');
                const awayEl = tr.querySelector('.match_away a, .match_away, td.away');
                const leagueEl = tr.querySelector('.league_name a, .league_name, td.league');

                if (!homeEl || !awayEl) return;

                let timeA = homeEl.innerText.trim().split('\n')[0];
                let timeB = awayEl.innerText.trim().split('\n')[0];

                if (!timeA || !timeB || timeA.length < 2 || timeB.length < 2) return;

                // Descarta se capturar texto do sistema
                if (/^(stats|odds|vip|live|today|corner)$/i.test(timeA) || /^(stats|odds|vip|live|today|corner)$/i.test(timeB)) return;

                // Extração limpa de horário
                const textoLinha = tr.innerText || '';
                const horaMatch = textoLinha.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/);
                const horaJogo = horaMatch ? horaMatch[0] : 'Hoje';

                // Extração limpa do nome da liga
                let ligaNome = "Campeonato Geral";
                if (leagueEl && leagueEl.innerText.trim()) {
                    ligaNome = leagueEl.innerText.trim();
                } else {
                    let prev = tr.previousElementSibling;
                    while (prev) {
                        if (prev.classList.contains('league') || prev.querySelector('.league_name') || prev.innerText.length < 50) {
                            let txt = prev.innerText.trim();
                            if (txt.length > 2 && txt.length < 60) {
                                ligaNome = txt.split('\n')[0];
                                break;
                            }
                        }
                        prev = prev.previousElementSibling;
                    }
                }

                ligaNome = ligaNome.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

                // Filtro para manter apenas as Top Ligas
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

        console.log(`⚽ [Bot V22] Total de partidas TOP LIGAS organizadas: ${jogosLimpos.length}`);

        if (jogosLimpos.length > 0) {
            // Card de Abertura
            let headerMsg = `🏆 <b>[ AGENDA DE ELITE // HOJE ]</b> 🏆\n`;
            headerMsg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
            headerMsg += `📊 <b>Jogos Selecionados:</b> <code>${jogosLimpos.length}</code>\n`;
            headerMsg += `🎯 <i>Organização Cirúrgica de Confrontos</i>\n`;
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
                card += `🤖 <i>Samuel Mega Bot • V22 VIP</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 700));
            }

            console.log(`✅ ${enviados} cards profissionais entregues no Telegram com sucesso!`);
        } else {
            console.log("⚠️ Nenhuma partida filtrada para envio.");
        }

    } catch (error) {
        console.error("❌ Erro no Radar V22:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

setInterval(executarAgendaV22, 1800000);
executarAgendaV22();
