const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V34 Debug & Ao Vivo Sem Filtros ⚡</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarV34() {
    let browser = null;
    try {
        console.log("⚡ [Bot V34 - DEBUG & SEM FILTROS] Iniciando varredura de TODOS os jogos ao vivo...");

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

        console.log("🌐 Acessando TotalCorner AO VIVO (https://www.totalcorner.com/match/live)...");
        const response = await page.goto('https://www.totalcorner.com/match/live', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        const status = response ? response.status() : 0;
        const pageTitle = await page.title();
        console.log(`📡 Status HTTP: ${status} | Título da Página: "${pageTitle}"`);

        // Pausa de 5s para garantir que os websockets e JS de ao vivo carreguem a tabela
        await new Promise(r => setTimeout(r, 5000));

        // ==========================================
        // 🛠️ MÓDULO DE INVESTIGAÇÃO / DIAGNÓSTICO
        // ==========================================
        const diagnostico = await page.evaluate(() => {
            const trs = Array.from(document.querySelectorAll('tr'));
            const trsComTimes = trs.filter(tr => tr.querySelectorAll('a[href*="/team/"]').length >= 2);
            
            // Pega amostra dos primeiros 3 jogos encontrados para depuração
            const amostras = trsComTimes.slice(0, 3).map((tr, idx) => {
                const links = Array.from(tr.querySelectorAll('a[href*="/team/"]')).map(a => a.innerText.trim());
                return {
                    index: idx + 1,
                    times: links,
                    textBruto: tr.innerText.replace(/\s+/g, ' ').substring(0, 150)
                };
            });

            return {
                totalTRs: trs.length,
                totalTRsComTimes: trsComTimes.length,
                amostras: amostras
            };
        });

        console.log(`🔍 [INVESTIGAÇÃO] Total <tr> na página: ${diagnostico.totalTRs}`);
        console.log(`🔍 [INVESTIGAÇÃO] Total <tr> com 2+ times: ${diagnostico.totalTRsComTimes}`);
        
        if (diagnostico.amostras.length > 0) {
            console.log("🔍 [INVESTIGAÇÃO] Amostras lidas no HTML:");
            diagnostico.amostras.forEach(a => {
                console.log(`   #${a.index}: [${a.times.join(' VS ')}] -> "${a.textBruto}"`);
            });
        } else {
            console.log("⚠️ [INVESTIGAÇÃO] Nenhum <tr> contendo times foi encontrado no HTML renderizado!");
        }

        // ==========================================
        // 🚀 EXTRAÇÃO ZERO FILTROS (CAPTURA TUDO)
        // ==========================================
        const jogosAoVivo = await page.evaluate(() => {
            const lista = [];
            const trs = Array.from(document.querySelectorAll('tr'));

            trs.forEach(tr => {
                const teamLinks = Array.from(tr.querySelectorAll('a[href*="/team/"]'));
                if (teamLinks.length < 2) return;

                const timeA = teamLinks[0].innerText.trim();
                const timeB = teamLinks[1].innerText.trim();

                if (!timeA || !timeB || timeA.length < 1 || timeB.length < 1) return;

                const textoLinha = tr.innerText || '';

                // Minuto / Tempo
                let tempoJogo = "Ao Vivo";
                const matchStatusElem = tr.querySelector('.match_status, .status, .timer, .span_match_status');
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

                // Placar
                let placar = "0 - 0";
                const goalElem = tr.querySelector('.match_goal, .score, .span_match_goal');
                if (goalElem && goalElem.innerText.trim()) {
                    placar = goalElem.innerText.trim();
                } else {
                    const matchScore = textoLinha.match(/\b(\d+)\s*[-:]\s*(\d+)\b/);
                    if (matchScore) placar = `${matchScore[1]} - ${matchScore[2]}`;
                }

                // Escanteios
                let escanteios = "N/I";
                const cornerElem = tr.querySelector('.match_corner, .corner, .span_match_corner');
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
                    const tds = Array.from(tr.querySelectorAll('td'));
                    for (const td of tds) {
                        const txt = td.innerText.trim();
                        const matchCantosTD = txt.match(/^(\d+)\s*[-:]\s*(\d+)$/);
                        if (matchCantosTD) {
                            const cA = parseInt(matchCantosTD[1]);
                            const cB = parseInt(matchCantosTD[2]);
                            if (cA + cB <= 35) {
                                escanteios = `${cA} - ${cB} (Total: ${cA + cB})`;
                            }
                        }
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
        });

        console.log(`⚡ [Bot V34 - SEM FILTROS] Total de jogos ao vivo extraídos: ${jogosAoVivo.length}`);

        if (jogosAoVivo.length > 0) {
            let headerMsg = `⚡ <b>[ RADAR AO VIVO V34 // TESTE SEM FILTROS ]</b> ⚽\n`;
            headerMsg += `────────────────────────\n`;
            headerMsg += `🔥 <b>Total de Jogos Encontrados:</b> <code>${jogosAoVivo.length}</code>\n`;
            headerMsg += `📡 <i>Mostrando TODOS os jogos sem nenhuma restrição</i>\n`;
            headerMsg += `────────────────────────`;

            await bot.sendMessage(CHAT_ID, headerMsg, { parse_mode: 'HTML' }).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));

            // Limita a enviar no máximo 15 jogos por ciclo para evitar flood no Telegram
            const limiteEnvio = Math.min(jogosAoVivo.length, 15);
            for (let i = 0; i < limiteEnvio; i++) {
                const j = jogosAoVivo[i];

                let card = `⚡ <b>JOGO AO VIVO #${i + 1} de ${jogosAoVivo.length}</b>\n`;
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
                card += `🤖 <i>Samuel Mega Bot • V34 Sem Filtros</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 600));
            }

            console.log(`✅ ${limiteEnvio} cards enviados com sucesso no Telegram!`);
        } else {
            // Se não achar nada, avisa no Telegram com relatório de diagnóstico
            let alertMsg = `⚠️ <b>[DIAGNÓSTICO V34] Nenhum jogo capturado</b>\n`;
            alertMsg += `────────────────────────\n`;
            alertMsg += `📡 <b>Status HTTP:</b> <code>${status}</code>\n`;
            alertMsg += `📄 <b>Título:</b> <code>${pageTitle}</code>\n`;
            alertMsg += `📊 <b>Linhas HTML (TRs):</b> <code>${diagnostico.totalTRs}</code>\n`;
            alertMsg += `🏟️ <b>Linhas com Times:</b> <code>${diagnostico.totalTRsComTimes}</code>\n`;
            alertMsg += `────────────────────────\n`;
            alertMsg += `<i>Verifique os logs no Render para ver as amostras do HTML.</i>`;
            
            await bot.sendMessage(CHAT_ID, alertMsg, { parse_mode: 'HTML' }).catch(() => {});
        }

    } catch (error) {
        console.error("❌ Erro no Radar V34:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro na execução V34:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

// Roda a cada 3 minutos
setInterval(executarRadarV34, 180000);
executarRadarV34();
