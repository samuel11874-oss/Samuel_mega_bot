const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V42 Ao Vivo Definitivo ⚡</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarV42AoVivo() {
    let browser = null;
    try {
        console.log("⚡ [Bot V42 - AO VIVO DEFINITIVO] Acessando e filtrando partidas in-play...");

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

        console.log("⏳ Aguardando renderização completa dos dados ao vivo...");
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

                // FILTRO RIGOROSO DE AO VIVO:
                // Procura marcador de minuto exato (ex: 12', 45'+1, 78') ou Intervalo (HT)
                // Se contiver formato de data/hora fixa (ex: 07/30 14:00), descarta pois é pré-live.
                const temMinuto = /(\b\d{1,2}'|HT|2H|1H)/.test(textoLinha);
                const temHorarioFixo = /\d{2}\/\d{2}\s+\d{2}:\d{2}/.test(textoLinha);

                // Só aceita se tiver o minuto ao vivo e NÃO tiver o horário fixo de pré-live
                if (!temMinuto || temHorarioFixo) return;

                // Extrai o Tempo / Minuto
                let tempoJogo = "Ao Vivo";
                const matchMin = textoLinha.match(/(\d{1,2}'(\+\d+)?|HT)/);
                if (matchMin) {
                    tempoJogo = matchMin[0];
                }

                // Extrai a Liga
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

                // Placar e Escanteios nas colunas (td)
                let placar = "0 - 0";
                let escanteios = "N/I";

                const tds = Array.from(tr.querySelectorAll('td'));
                tds.forEach(td => {
                    const txt = td.innerText.trim();
                    // Procura placar (ex: 1 - 0)
                    if (/^\d+\s*[-:]\s*\d+$/.test(txt) && !txt.includes('.')) {
                        placar = txt;
                    }
                });

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

        console.log(`⚡ [Bot V42] Total de jogos AO VIVO reais capturados: ${jogosAoVivo.length}`);

        if (jogosAoVivo.length > 0) {
            let headerMsg = `⚡ <b>[ RADAR V42 // AO VIVO REAL ]</b> ⚽\n`;
            headerMsg += `────────────────────────\n`;
            headerMsg += `🔥 <b>Jogos Rolando Agora:</b> <code>${jogosAoVivo.length}</code>\n`;
            headerMsg += `────────────────────────`;

            await bot.sendMessage(CHAT_ID, headerMsg, { parse_mode: 'HTML' }).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));

            for (let i = 0; i < jogosAoVivo.length; i++) {
                const j = jogosAoVivo[i];

                let card = `⚡ <b>AO VIVO #${i + 1} de ${jogosAoVivo.length}</b>\n`;
                card += `────────────────────────\n`;
                card += `🏆 <b>Liga:</b> <code>${j.liga}</code>\n`;
                card += `⏱️ <b>Tempo:</b> <code>${j.tempo}</code>\n\n`;
                card += `🏠 <b>${j.timeA}</b>\n`;
                card += `   <b>VS</b>\n`;
                card += `✈️ <b>${j.timeB}</b>\n`;
                card += `────────────────────────\n`;
                card += `⚽ <b>Placar/Dados:</b> <code>${j.placar}</code>\n`;
                card += `────────────────────────\n`;
                card += `🤖 <i>Samuel Mega Bot • V42 In-Play</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 600));
            }

            console.log(`✅ ${jogosAoVivo.length} cards ao vivo enviados com sucesso para o Telegram!`);
        } else {
            console.log("ℹ️ Nenhum jogo com minuto ativo no momento.");
            await bot.sendMessage(CHAT_ID, `ℹ️ <b>[V42 Ao Vivo]</b> Nenhum jogo rolando no momento exato desta varredura. O bot continua monitorando a cada 3 minutos.`, { parse_mode: 'HTML' }).catch(() => {});
        }

    } catch (error) {
        console.error("❌ Erro no Radar V42:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro V42:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

// Roda a cada 3 minutos
setInterval(executarRadarV42AoVivo, 180000);
executarRadarV42AoVivo();
