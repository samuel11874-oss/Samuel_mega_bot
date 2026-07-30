const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V27 Métricas Reais 📊</h2>'));
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

async function executarRadarV27() {
    let browser = null;
    try {
        console.log("📊 [Bot V27] Mapeando jogos e buscando dados ESTATÍSTICOS REAIS no TotalCorner...");

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

        // Extração dos confrontos e busca das estatísticas REAIS via fetch interno no browser
        const jogosComEstatistica = await page.evaluate(async (ligasFiltro, proibidos) => {
            const lista = [];
            const trs = Array.from(document.querySelectorAll('tr'));

            for (const tr of trs) {
                const teamLinks = Array.from(tr.querySelectorAll('a[href*="/team/"]'));
                if (teamLinks.length < 2) continue;

                const timeA = teamLinks[0].innerText.trim();
                const timeB = teamLinks[1].innerText.trim();

                if (!timeA || !timeB || timeA.length < 2 || timeB.length < 2) continue;

                // Captura link das estatísticas reais do jogo no TotalCorner
                const statLinkEl = tr.querySelector('a[href*="/match/stat/"], a[href*="/match/corner/"], a[href*="/match/detail/"]');
                const matchUrl = statLinkEl ? statLinkEl.href : null;

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
                if (proibidos.some(termo => contextoCompleto.includes(termo))) continue;

                // FILTRO DE LIGAS PRINCIPAIS
                if (!ligasFiltro.some(l => contextoCompleto.includes(l))) continue;

                // EXTRAÇÃO REAIS DE ESTATÍSTICAS
                let cantosReal = "Não informado no site";
                let cartoesReal = "Não informado no site";
                let golsStr = "Não informado no site";

                // Tenta pegar a linha de escanteios informada diretamente na tabela principal
                const tds = Array.from(tr.querySelectorAll('td'));
                tds.forEach(td => {
                    const txt = td.innerText.trim();
                    if (/^\d{1,2}\.\d$/.test(txt) && parseFloat(txt) >= 7.0 && parseFloat(txt) <= 14.5) {
                        cantosReal = `${txt} (Linha/Média TotalCorner)`;
                    }
                });

                // Se houver URL do jogo, faz requisição em tempo real para obter a ficha estatística completa
                if (matchUrl) {
                    try {
                        const resp = await fetch(matchUrl);
                        if (resp.ok) {
                            const html = await resp.text();
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(html, 'text/html');

                            // Varre os textos da ficha técnica real
                            const allTexts = Array.from(doc.querySelectorAll('tr, div, td')).map(el => el.innerText.trim());

                            let hcasa = null, hfora = null;

                            allTexts.forEach(t => {
                                // Média Real de Escanteios
                                if ((t.includes('Corner') || t.includes('Escanteio')) && /\d+\.\d+/.test(t)) {
                                    const val = t.match(/\d+\.\d+/);
                                    if (val) cantosReal = `${val[0]} / jogo`;
                                }
                                // Média Real de Cartões
                                if ((t.includes('Yellow Card') || t.includes('Card')) && /\d+\.\d+/.test(t)) {
                                    const val = t.match(/\d+\.\d+/);
                                    if (val) cartoesReal = `${val[0]} / jogo`;
                                }
                                // Média Real de Gols
                                if (t.includes('Goal Avg') || t.includes('Average Goals')) {
                                    const vals = t.match(/\d+\.\d+/g);
                                    if (vals && vals.length >= 2) {
                                        hcasa = vals[0];
                                        hfora = vals[1];
                                    }
                                }
                            });

                            if (hcasa && hfora) {
                                golsStr = `🏠 ${hcasa} | ✈️ ${hfora}`;
                            }
                        }
                    } catch (err) {
                        // Mantém a extração inicial se houver erro de rede pontual
                    }
                }

                lista.push({
                    timeA: timeA,
                    timeB: timeB,
                    hora: horaJogo,
                    liga: ligaNome,
                    cantosAvg: cantosReal,
                    cartoesAvg: cartoesReal,
                    golsStr: golsStr
                });
            }

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

        console.log(`⚽ [Bot V27] Partidas com dados estatísticos reais processadas: ${jogosComEstatistica.length}`);

        if (jogosComEstatistica.length > 0) {
            let headerMsg = `🎯 <b>[ RADAR PRO // STATS 100% REAIS ]</b> 📊\n`;
            headerMsg += `────────────────────────\n`;
            headerMsg += `📊 <b>Jogos Selecionados:</b> <code>${jogosComEstatistica.length}</code>\n`;
            headerMsg += `⚡ <i>Métricas extraídas em tempo real do TotalCorner</i>\n`;
            headerMsg += `────────────────────────`;

            await bot.sendMessage(CHAT_ID, headerMsg, { parse_mode: 'HTML' }).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));

            let enviados = 0;

            for (let i = 0; i < jogosComEstatistica.length; i++) {
                const j = jogosComEstatistica[i];
                enviados++;

                let card = `⚽ <b>INFORMAÇÕES DA PARTIDA ENCONTRADA #${enviados}</b>\n`;
                card += `────────────────────────\n`;
                card += `🏆 <b>Liga:</b> <code>${j.liga}</code>\n`;
                card += `⏰ <b>Horário:</b> <code>${j.hora}</code>\n\n`;
                card += `🏠 <b>${j.timeA}</b>\n`;
                card += `   <b>VS</b>\n`;
                card += `✈️ <b>${j.timeB}</b>\n`;
                card += `────────────────────────\n`;
                card += `📊 <b>MÉDIAS REAIS DO TOTALCORNER (FT)</b>\n`;
                card += `🚩 <b>Escanteios:</b> <code>${j.cantosAvg}</code>\n`;
                card += `🟨 <b>Cartões:</b> <code>${j.cartoesAvg}</code>\n`;
                card += `⚽ <b>Gols (Média):</b> <code>${j.golsStr}</code>\n`;
                card += `────────────────────────\n`;
                card += `🤖 <i>Samuel Mega Bot • V27 Dados Reais</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 700));
            }

            console.log(`✅ ${enviados} cards com dados reais entregues com sucesso!`);
        } else {
            console.log("⚠️ Nenhuma partida filtrada para envio nesta rodada.");
        }

    } catch (error) {
        console.error("❌ Erro no Radar V27:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

setInterval(executarRadarV27, 1800000);
executarRadarV27();
