const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V28 Tabela Direta 📊</h2>'));
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

async function executarRadarV28() {
    let browser = null;
    try {
        console.log("📊 [Bot V28] Extraindo métricas reais diretamente da tabela principal...");

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
            console.log("⚠️ Aguardando elementos da página...");
        });

        await new Promise(r => setTimeout(r, 3000));

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

                const contextoCompleto = (timeA + ' ' + timeB + ' ' + ligaNome + ' ' + textoLinha).toLowerCase();

                // Filtro Anti-Base/Amador
                if (proibidos.some(termo => contextoCompleto.includes(termo))) return;

                // Filtro de Ligas
                if (!ligasFiltro.some(l => contextoCompleto.includes(l))) return;

                // RASPADOR DE LINHAS ESTATÍSTICAS DA TABELA PRINCIPAL
                const tds = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
                
                let cantoLinha = "Não disponível pré-jogo";
                let golLinha = "Não disponível pré-jogo";

                // Procura valores decimais típicos de linhas no TotalCorner (ex: 9.5, 10.0, 2.5)
                const numerosDecimais = tds.filter(t => /^\d{1,2}\.\d{1,2}$/.test(t));

                numerosDecimais.forEach(num => {
                    const val = parseFloat(num);
                    if (val >= 7.5 && val <= 14.5 && cantoLinha === "Não disponível pré-jogo") {
                        cantoLinha = `${num} (Linha do Confronto)`;
                    } else if (val >= 1.5 && val <= 4.5 && golLinha === "Não disponível pré-jogo") {
                        golLinha = `${num} Gols (Linha O/U)`;
                    }
                });

                lista.push({
                    timeA: timeA,
                    timeB: timeB,
                    hora: horaJogo,
                    liga: ligaNome,
                    cantos: cantoLinha,
                    gols: golLinha,
                    cartoes: "Disponível apenas Ao Vivo no TotalCorner"
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

        console.log(`⚽ [Bot V28] Partidas com estatísticas reais extraídas: ${jogosProcessados.length}`);

        if (jogosProcessados.length > 0) {
            let headerMsg = `🎯 <b>[ RADAR PRO // LINHAS REAIS TOTALCORNER ]</b> 📊\n`;
            headerMsg += `────────────────────────\n`;
            headerMsg += `📊 <b>Jogos Selecionados:</b> <code>${jogosProcessados.length}</code>\n`;
            headerMsg += `⚡ <i>Linhas extraídas da grade oficial do TotalCorner</i>\n`;
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
                card += `📊 <b>MÉDIAS & LINHAS REAIS (FT)</b>\n`;
                card += `🚩 <b>Escanteios:</b> <code>${j.cantos}</code>\n`;
                card += `⚽ <b>Gols:</b> <code>${j.gols}</code>\n`;
                card += `🟨 <b>Cartões:</b> <code>${j.cartoes}</code>\n`;
                card += `────────────────────────\n`;
                card += `🤖 <i>Samuel Mega Bot • V28 Tabela Direta</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 700));
            }

            console.log(`✅ ${enviados} cards atualizados e entregues no Telegram!`);
        } else {
            console.log("⚠️ Nenhuma partida filtrada nesta rodada.");
        }

    } catch (error) {
        console.error("❌ Erro no Radar V28:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

setInterval(executarRadarV28, 1800000);
executarRadarV28();
