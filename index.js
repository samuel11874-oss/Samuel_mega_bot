const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V37 Ao Vivo Real ⚡</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarV37() {
    let browser = null;
    try {
        console.log("⚡ [Bot V37 - AO VIVO REAL] Acessando a página de jogos ao vivo...");

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

        console.log("🌐 Acessando https://www.totalcorner.com/match/live ...");
        await page.goto('https://www.totalcorner.com/match/live', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // O pulo do gato: A página ao vivo injeta os dados via JS/AJAX. Aguardamos 8 segundos para garantir o preenchimento da tabela.
        console.log("⏳ Aguardando carregamento dinâmico dos dados ao vivo...");
        await new Promise(r => setTimeout(r, 8000));

        const jogosAoVivo = await page.evaluate(() => {
            const lista = [];
            const trs = Array.from(document.querySelectorAll('tr'));

            trs.forEach(tr => {
                const teamLinks = Array.from(tr.querySelectorAll('a[href*="/team/"]'));
                if (teamLinks.length < 2) return;

                const timeA = teamLinks[0].innerText.trim();
                const timeB = teamLinks[1].innerText.trim();

                if (!timeA || !timeB) return;

                const textoLinha = tr.innerText || '';

                // Minuto / Tempo de Jogo Ao Vivo
                let tempoJogo = "Ao Vivo";
                const matchMinuto = textoLinha.match(/\b([0-9]{1,2})['′]/);
                if (matchMinuto) {
                    tempoJogo = `${matchMinuto[1]}' min`;
                } else if (textoLinha.includes('HT') || textoLinha.includes('Half') || textoLinha.includes('Intervalo')) {
                    tempoJogo = "Intervalo (HT)";
                } else {
                    const tds = Array.from(tr.querySelectorAll('td'));
                    for (const td of tds) {
                        const txt = td.innerText.trim();
                        if (/^\d{1,2}'$/.test(txt) || txt === 'HT' || txt === '2H' || txt === '1H') {
                            tempoJogo = txt;
                            break;
                        }
                    }
                }

                // Liga
                let ligaNome = "Ao Vivo";
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

                // Placar Ao Vivo
                let placar = "0 - 0";
                const matchScore = textoLinha.match(/\b(\d+)\s*[-:]\s*(\d+)\b/);
                if (matchScore) {
                    placar = `${matchScore[1]} - ${matchScore[2]}`;
                }

                // Escanteios Ao Vivo
                let escanteios = "0 - 0";
                const tds = Array.from(tr.querySelectorAll('td'));
                for (const td of tds) {
                    const txt = td.innerText.trim();
                    const matchCantos = txt.match(/^(\d+)\s*[-:]\s*(\d+)$/);
                    if (matchCantos) {
                        const cA = parseInt(matchCantos[1]);
                        const cB = parseInt(matchCantos[2]);
                        if (cA + cB <= 35) {
                            escanteios = `${cA} - ${cB} (Total: ${cA + cB})`;
                            break;
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

            // Remove duplicados
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

        console.log(`⚡ [Bot V37] Total de jogos AO VIVO extraídos: ${jogosAoVivo.length}`);

        if (jogosAoVivo.length > 0) {
            let headerMsg = `⚡ <b>[ RADAR AO VIVO V37 // EM TEMPO REAL ]</b> ⚽\n`;
            headerMsg += `────────────────────────\n`;
            headerMsg += `🔥 <b>Jogos Ao Vivo Encontrados:</b> <code>${jogosAoVivo.length}</code>\n`;
            headerMsg += `────────────────────────`;

            await bot.sendMessage(CHAT_ID, headerMsg, { parse_mode: 'HTML' }).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));

            const limite = Math.min(jogosAoVivo.length, 15);
            for (let i = 0; i < limite; i++) {
                const j = jogosAoVivo[i];

                let card = `⚡ <b>JOGO AO VIVO #${i + 1} de ${jogosAoVivo.length}</b>\n`;
                card += `────────────────────────\n`;
                card += `🏆 <b>Liga:</b> <code>${j.liga}</code>\n`;
                card += `⏱️ <b>Tempo:</b> <code>${j.tempo}</code>\n\n`;
                card += `🏠 <b>${j.timeA}</b>\n`;
                card += `   <b>VS</b>\n`;
                card += `✈️ <b>${j.timeB}</b>\n`;
                card += `────────────────────────\n`;
                card += `⚽ <b>Placar:</b> <code>${j.placar}</code>\n`;
                card += `🚩 <b>Escanteios:</b> <code>${j.escanteios}</code>\n`;
                card += `────────────────────────\n`;
                card += `🤖 <i>Samuel Mega Bot • V37 Ao Vivo Real</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 600));
            }

            console.log(`✅ ${limite} cards ao vivo enviados com sucesso para o Telegram!`);
        } else {
            await bot.sendMessage(CHAT_ID, `⚠️ <b>[V37]</b> Nenhum jogo ao vivo rolando no momento da varredura.`, { parse_mode: 'HTML' }).catch(() => {});
        }

    } catch (error) {
        console.error("❌ Erro no Radar V37:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro V37:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

// Roda a cada 3 minutos para manter atualizado
setInterval(executarRadarV37, 180000);
executarRadarV37();
