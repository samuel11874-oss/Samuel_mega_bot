const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V33 Ao Vivo ⚡</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Ligas Principais de Elite
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

async function executarRadarV33AoVivo() {
    let browser = null;
    try {
        console.log("⚡ [Bot V33] Varrendo jogos AO VIVO no TotalCorner...");

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

        console.log("🌐 Acessando TotalCorner AO VIVO...");
        await page.goto('https://www.totalcorner.com/match/live', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        await new Promise(r => setTimeout(r, 4000));

        const jogosAoVivo = await page.evaluate((ligasFiltro, proibidos) => {
            const lista = [];
            const trs = Array.from(document.querySelectorAll('tr'));

            trs.forEach(tr => {
                const teamLinks = Array.from(tr.querySelectorAll('a[href*="/team/"]'));
                if (teamLinks.length < 2) return;

                const timeA = teamLinks[0].innerText.trim();
                const timeB = teamLinks[1].innerText.trim();

                if (!timeA || !timeB || timeA.length < 2 || timeB.length < 2) return;

                const textoLinha = tr.innerText || '';

                // Extração do Minuto / Status do Jogo
                let tempoJogo = "Ao Vivo";
                const matchStatusElem = tr.querySelector('.match_status, .status, .timer');
                if (matchStatusElem && matchStatusElem.innerText.trim()) {
                    tempoJogo = matchStatusElem.innerText.trim();
                } else {
                    const matchMinuto = textoLinha.match(/\b([0-9]{1,2})['′]/);
                    if (matchMinuto) {
                        tempoJogo = `${matchMinuto[1]}' min`;
                    } else if (textoLinha.includes('HT') || textoLinha.includes('Half')) {
                        tempoJogo = "Intervalo (HT)";
                    }
                }

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

                if (proibidos.some(termo => contexto.includes(termo))) return;
                if (!ligasFiltro.some(l => contexto.includes(l))) return;

                // Extração do Placar (Gols)
                let placar = "0 - 0";
                const goalElem = tr.querySelector('.match_goal, .score');
                if (goalElem && goalElem.innerText.trim()) {
                    placar = goalElem.innerText.trim();
                } else {
                    const matchScore = textoLinha.match(/\b(\d+)\s*[-:]\s*(\d+)\b/);
                    if (matchScore) placar = `${matchScore[1]} - ${matchScore[2]}`;
                }

                // Extração de Escanteios Ao Vivo
                let escanteios = "N/I";
                const cornerElem = tr.querySelector('.match_corner, .corner');
                if (cornerElem && cornerElem.innerText.trim()) {
                    const txtCorner = cornerElem.innerText.trim();
                    const matchCantos = txtCorner.match(/(\d+)\s*[-:]\s*(\d+)/);
                    if (matchCantos) {
                        const cA = parseInt(matchCantos[1]);
                        const cB = parseInt(matchCantos[2]);
                        escanteios = `${cA} - ${cB} (Total: ${cA + cB})`;
                    } else {
                        escanteios = txtCorner;
                    }
                } else {
                    const matchCantosGeral = textoLinha.match(/\b(\d+)\s*[-]\s*(\d+)\b/g);
                    if (matchCantosGeral && matchCantosGeral.length > 1) {
                        escanteios = matchCantosGeral[1];
                    }
                }

                lista.push({
                    timeA: timeA,
                    timeB: timeB,
                    tempo: tempoJogo,
                    liga: ligaNome,
                    placar: placar,
                    escanteios: escanteios
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

        console.log(`⚡ [Bot V33] ${jogosAoVivo.length} partidas AO VIVO capturadas.`);

        if (jogosAoVivo.length > 0) {
            let headerMsg = `⚡ <b>[ RADAR AO VIVO // IN-PLAY V33 ]</b> ⚽\n`;
            headerMsg += `────────────────────────\n`;
            headerMsg += `🔥 <b>Partidas Rolando Agora:</b> <code>${jogosAoVivo.length}</code>\n`;
            headerMsg += `📡 <i>Atualizações em tempo real do TotalCorner</i>\n`;
            headerMsg += `────────────────────────`;

            await bot.sendMessage(CHAT_ID, headerMsg, { parse_mode: 'HTML' }).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));

            let enviados = 0;

            for (let i = 0; i < jogosAoVivo.length; i++) {
                const j = jogosAoVivo[i];
                enviados++;

                let card = `⚡ <b>PARTIDA AO VIVO ENCONTRADA #${enviados}</b>\n`;
                card += `────────────────────────\n`;
                card += `🏆 <b>Liga:</b> <code>${j.liga}</code>\n`;
                card += `⏱️ <b>Tempo:</b> <code>${j.tempo}</code>\n\n`;
                card += `🏠 <b>${j.timeA}</b>\n`;
                card += `   <b>VS</b>\n`;
                card += `✈️ <b>${j.timeB}</b>\n`;
                card += `────────────────────────\n`;
                card += `⚽ <b>Placar Ao Vivo:</b> <code>${j.placar}</code>\n`;
                card += `🚩 <b>Escanteios Ao Vivo:</b> <code>${j.escanteios}</code>\n`;
                card += `────────────────────────\n`;
                card += `🤖 <i>Samuel Mega Bot • V33 In-Play Radar</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 700));
            }

            console.log(`✅ ${enviados} cards ao vivo entregues no Telegram!`);
        } else {
            console.log("ℹ️ Nenhuma partida das ligas selecionadas rolando ao vivo no momento.");
        }

    } catch (error) {
        console.error("❌ Erro no Radar V33 Ao Vivo:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

// Roda a cada 5 minutos (300.000 ms) para monitorar o ao vivo
setInterval(executarRadarV33AoVivo, 300000);
executarRadarV33AoVivo();
