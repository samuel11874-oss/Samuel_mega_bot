const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V40 Ao Vivo Real ⚡</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarV40() {
    let browser = null;
    try {
        console.log("⚡ [Bot V40] Acessando /match/live para varredura cirúrgica ao vivo...");

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

        // Aguarda o carregamento completo da tabela
        await new Promise(r => setTimeout(r, 6000));

        const resultadoAoVivo = await page.evaluate(() => {
            const listaAoVivo = [];
            const trs = Array.from(document.querySelectorAll('tr'));

            trs.forEach(tr => {
                const teamLinks = Array.from(tr.querySelectorAll('a[href*="/team/"]'));
                if (teamLinks.length < 2) return;

                const timeA = teamLinks[0].innerText.trim();
                const timeB = teamLinks[1].innerText.trim();
                if (!timeA || !timeB) return;

                const textoLinha = tr.innerText || '';

                // FILTRO CRUCIAL DE AO VIVO: 
                // Um jogo só é considerado AO VIVO se tiver o marcador de minuto (ex: 35', 78') ou Intervalo (HT)
                // Se tiver formato de data/hora fixa (ex: 07/30 14:00 ou 14:00), descarta pois é pré-live.
                const temMinutoAoVivo = /\b([0-9]{1,2})['′]/g.test(textoLinha) || textoLinha.includes('HT') || textoLinha.includes('2H') || textoLinha.includes('1H');
                const temHorarioFixo = /\b\d{2}\/\d{2}\s+\d{2}:\d{2}\b/.test(textoLinha);

                if (!temMinutoAoVivo && temHorarioFixo) return; // Ignora se for jogo futuro do dia

                // Extrai o Minuto / Status
                let tempoJogo = "Ao Vivo";
                const matchMin = textoLinha.match(/\b([0-9]{1,2})['′]/);
                if (matchMin) {
                    tempoJogo = `${matchMin[1]}' min`;
                } else if (textoLinha.includes('HT')) {
                    tempoJogo = "Intervalo (HT)";
                }

                // Extrai Liga
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

                // Placar
                let placar = "0 - 0";
                const matchScore = textoLinha.match(/\b(\d+)\s*[-:]\s*(\d+)\b/);
                if (matchScore) {
                    placar = `${matchScore[1]} - ${matchScore[2]}`;
                }

                // Escanteios
                let escanteios = "N/I";
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

                listaAoVivo.push({
                    timeA: timeA,
                    timeB: timeB,
                    tempo: tempoJogo,
                    liga: ligaNome,
                    placar: placar,
                    escanteios: escanteios
                });
            });

            // Deduplica
            const unicos = [];
            const vistos = new Set();
            listaAoVivo.forEach(item => {
                const chave = `${item.timeA} x ${item.timeB}`;
                if (!vistos.has(chave)) {
                    vistos.add(chave);
                    unicos.push(item);
                }
            });

            return unicos;
        });

        console.log(`⚡ [Bot V40] Jogos AO VIVO reais filtrados: ${resultadoAoVivo.length}`);

        if (resultadoAoVivo.length > 0) {
            let headerMsg = `⚡ <b>[ RADAR V40 // AO VIVO REAL ]</b> ⚽\n`;
            headerMsg += `────────────────────────\n`;
            headerMsg += `🔥 <b>Partidas Rolando Agora:</b> <code>${resultadoAoVivo.length}</code>\n`;
            headerMsg += `────────────────────────`;

            await bot.sendMessage(CHAT_ID, headerMsg, { parse_mode: 'HTML' }).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));

            for (let i = 0; i < resultadoAoVivo.length; i++) {
                const j = resultadoAoVivo[i];

                let card = `⚡ <b>AO VIVO #${i + 1} de ${resultadoAoVivo.length}</b>\n`;
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
                card += `🤖 <i>Samuel Mega Bot • V40 In-Play Real</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 600));
            }

            console.log(`✅ ${resultadoAoVivo.length} cards ao vivo enviados com sucesso!`);
        } else {
            console.log("ℹ️ Nenhum jogo com minuto ao vivo ativo no momento da varredura.");
            await bot.sendMessage(CHAT_ID, `ℹ️ <b>[V40 Ao Vivo]</b> Nenhum jogo rolando no momento exato desta verificação. O bot continuará monitorando a cada 3 minutos.`, { parse_mode: 'HTML' }).catch(() => {});
        }

    } catch (error) {
        console.error("❌ Erro no Radar V40:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro V40:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

// Roda a cada 3 minutos
setInterval(executarRadarV40, 180000);
executarRadarV40();
