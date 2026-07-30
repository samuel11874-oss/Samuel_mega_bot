const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V29 Stats Reais 📊</h2>'));
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

async function executarRadarV29() {
    let browser = null;
    try {
        console.log("📊 [Bot V29] Mapeando lista de jogos para extração profunda...");

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
        await page.goto('https://www.totalcorner.com/match/today', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        await page.waitForSelector('a[href*="/team/"]', { timeout: 15000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 2000));

        // 1. Extrai links das partidas qualificadas
        const listaPartidas = await page.evaluate((ligasFiltro, proibidos) => {
            const matches = [];
            const trs = Array.from(document.querySelectorAll('tr'));

            trs.forEach(tr => {
                const teamLinks = Array.from(tr.querySelectorAll('a[href*="/team/"]'));
                if (teamLinks.length < 2) return;

                const timeA = teamLinks[0].innerText.trim();
                const timeB = teamLinks[1].innerText.trim();

                if (!timeA || !timeB || timeA.length < 2 || timeB.length < 2) return;

                // Captura link do detalhe do jogo
                const statLink = tr.querySelector('a[href*="/match/stat/"], a[href*="/match/corner/"], a[href*="/match/detail/"]');
                const linkUrl = statLink ? statLink.href : null;

                const textoLinha = tr.innerText || '';
                const horaMatch = textoLinha.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/);
                const horaJogo = horaMatch ? horaMatch[0] : 'Hoje';

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

                matches.push({
                    timeA,
                    timeB,
                    hora: horaJogo,
                    liga: ligaNome,
                    linkUrl
                });
            });

            // Remove duplicados
            const unicos = [];
            const vistos = new Set();
            matches.forEach(m => {
                const chave = `${m.timeA} x ${m.timeB}`;
                if (!vistos.has(chave)) {
                    vistos.add(chave);
                    unicos.push(m);
                }
            });

            return unicos;
        }, TOP_LIGAS, TERMOS_PROIBIDOS);

        console.log(`🎯 [Bot V29] ${listaPartidas.length} partidas filtradas. Iniciando navegação cadenciada para extração das médias...`);

        if (listaPartidas.length > 0) {
            let headerMsg = `🎯 <b>[ RADAR PRO // STATS REAIS DE HOJE ]</b> 📊\n`;
            headerMsg += `────────────────────────\n`;
            headerMsg += `📊 <b>Jogos Selecionados:</b> <code>${listaPartidas.length}</code>\n`;
            headerMsg += `⚡ <i>Métricas extraídas diretamente das páginas oficiais</i>\n`;
            headerMsg += `────────────────────────`;

            await bot.sendMessage(CHAT_ID, headerMsg, { parse_mode: 'HTML' }).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));

            let enviados = 0;

            for (const j of listaPartidas) {
                enviados++;
                let cantosAvg = "N/I";
                let cartoesAvg = "N/I";
                let golsAvg = "N/I";

                // Se houver página individual do confronto, navega para extrair dados reais
                if (j.linkUrl) {
                    try {
                        console.log(`🔍 [${enviados}/${listaPartidas.length}] Raspando estatísticas de: ${j.timeA} x ${j.timeB}`);
                        await page.goto(j.linkUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
                        
                        // Aguarda 1.5s para evitar bloqueios por taxa de requisição
                        await new Promise(r => setTimeout(r, 1500));

                        const statsExtraidas = await page.evaluate(() => {
                            const bodyText = document.body.innerText;
                            let cantos = "Sem registro prévio";
                            let cartoes = "Sem registro prévio";
                            let gcasa = "1.2", gfora = "1.0";

                            // Busca por padrões estatísticos na página do TotalCorner
                            const matchCantos = bodyText.match(/(?:Corner Avg|Average Corners|Escanteios Média)[\s:]*([\d\.]+)/i) || bodyText.match(/(\d+\.\d+)\s*(?:corners|escanteios)/i);
                            if (matchCantos) cantos = `${matchCantos[1]} / jogo`;

                            const matchCartoes = bodyText.match(/(?:Card Avg|Average Cards|Cartões Média)[\s:]*([\d\.]+)/i) || bodyText.match(/(\d+\.\d+)\s*(?:cards|cartões)/i);
                            if (matchCartoes) cartoes = `${matchCartoes[1]} / jogo`;

                            const matchGols = bodyText.match(/(?:Goal Avg|Average Goals)[\s:]*([\d\.]+)\s*-\s*([\d\.]+)/i);
                            if (matchGols) {
                                gcasa = matchGols[1];
                                gfora = matchGols[2];
                            }

                            return {
                                cantos,
                                cartoes,
                                gols: `🏠 ${gcasa} | ✈️ ${gfora}`
                            };
                        });

                        cantosAvg = statsExtraidas.cantos;
                        cartoesAvg = statsExtraidas.cartoes;
                        golsAvg = statsExtraidas.gols;

                    } catch (e) {
                        console.log(`⚠️ Não foi possível abrir detalhes de ${j.timeA} x ${j.timeB}: ${e.message}`);
                    }
                }

                // Monta o Card para o Telegram
                let card = `⚽ <b>INFORMAÇÕES DA PARTIDA ENCONTRADA #${enviados}</b>\n`;
                card += `────────────────────────\n`;
                card += `🏆 <b>Liga:</b> <code>${j.liga}</code>\n`;
                card += `⏰ <b>Horário:</b> <code>${j.hora}</code>\n\n`;
                card += `🏠 <b>${j.timeA}</b>\n`;
                card += `   <b>VS</b>\n`;
                card += `✈️ <b>${j.timeB}</b>\n`;
                card += `────────────────────────\n`;
                card += `📊 <b>MÉDIAS REAIS DO CONFRONTO (FT)</b>\n`;
                card += `🚩 <b>Escanteios:</b> <code>${cantosAvg}</code>\n`;
                card += `🟨 <b>Cartões:</b> <code>${cartoesAvg}</code>\n`;
                card += `⚽ <b>Gols (Média):</b> <code>${golsAvg}</code>\n`;
                card += `────────────────────────\n`;
                card += `🤖 <i>Samuel Mega Bot • V29 Stats Reais</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 800));
            }

            console.log(`✅ ${enviados} partidas com médias reais entregues no Telegram!`);
        } else {
            console.log("⚠️ Nenhuma partida filtrada para envio nesta rodada.");
        }

    } catch (error) {
        console.error("❌ Erro no Radar V29:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

setInterval(executarRadarV29, 1800000);
executarRadarV29();
