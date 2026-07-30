const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V36 Pré-Live Oficial ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarV36() {
    let browser = null;
    try {
        console.log("⚽ [Bot V36] Acessando a tabela oficial de jogos do dia no TotalCorner...");

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

        console.log("🌐 Acessando https://www.totalcorner.com/match/today ...");
        await page.goto('https://www.totalcorner.com/match/today', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        await new Promise(r => setTimeout(r, 5000));

        const jogosDoDia = await page.evaluate(() => {
            const lista = [];
            const trs = Array.from(document.querySelectorAll('tr'));

            trs.forEach(tr => {
                const teamLinks = Array.from(tr.querySelectorAll('a[href*="/team/"]'));
                if (teamLinks.length < 2) return;

                const timeA = teamLinks[0].innerText.trim();
                const timeB = teamLinks[1].innerText.trim();

                if (!timeA || !timeB) return;

                const textoLinha = tr.innerText || '';

                // Extrai Horário (ex: 14:00)
                const horaMatch = textoLinha.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/);
                const horario = horaMatch ? horaMatch[0] : 'Hoje';

                // Extrai Liga procurando o link da liga ou subindo no HTML
                let ligaNome = "Partidas do Dia";
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

                // Extrai Linha de Canto e Média se houver nas colunas (td)
                let linhaCanto = "N/I";
                let mediaCanto = "N/I";
                
                const tds = Array.from(tr.querySelectorAll('td'));
                tds.forEach(td => {
                    const txt = td.innerText.trim();
                    // Procura padrão de linha de escanteio (ex: 8.5, 9.5, 10.5)
                    if (/^(?:[7-9]|1[0-2])\.[05]$/.test(txt)) {
                        if (linhaCanto === "N/I") linhaCanto = txt;
                        else if (mediaCanto === "N/I") mediaCanto = txt;
                    }
                });

                lista.push({
                    timeA: timeA,
                    timeB: timeB,
                    horario: horario,
                    liga: ligaNome,
                    linhaCanto: linhaCanto,
                    mediaCanto: mediaCanto
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

        console.log(`✅ [Bot V36] Total de confrontos extraídos com sucesso: ${jogosDoDia.length}`);

        if (jogosDoDia.length > 0) {
            let headerMsg = `⚽ <b>[ RADAR V36 // CONFRONTOS DO DIA ]</b> 🎯\n`;
            headerMsg += `────────────────────────\n`;
            headerMsg += `📊 <b>Total de Jogos Carregados:</b> <code>${jogosDoDia.length}</code>\n`;
            headerMsg += `────────────────────────`;

            await bot.sendMessage(CHAT_ID, headerMsg, { parse_mode: 'HTML' }).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));

            // Envia os primeiros 15 jogos para o Telegram
            const limite = Math.min(jogosDoDia.length, 15);
            for (let i = 0; i < limite; i++) {
                const j = jogosDoDia[i];

                let card = `⚽ <b>JOGO #${i + 1} de ${jogosDoDia.length}</b>\n`;
                card += `────────────────────────\n`;
                card += `🏆 <b>Liga:</b> <code>${j.liga}</code>\n`;
                card += `⏰ <b>Horário:</b> <code>${j.horario}</code>\n\n`;
                card += `🏠 <b>${j.timeA}</b>\n`;
                card += `   <b>VS</b>\n`;
                card += `✈️ <b>${j.timeB}</b>\n`;
                card += `────────────────────────\n`;
                card += `🚩 <b>Linha de Canto:</b> <code>${j.linhaCanto}</code>\n`;
                card += `📊 <b>Média Estimada:</b> <code>${j.mediaCanto}</code>\n`;
                card += `────────────────────────\n`;
                card += `🤖 <i>Samuel Mega Bot • V36 Pré-Live</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 600));
            }

            console.log(`🚀 ${limite} cards enviados para o seu Telegram com sucesso!`);
        } else {
            await bot.sendMessage(CHAT_ID, `⚠️ <b>[V36]</b> Nenhum jogo encontrado na tabela do dia.`, { parse_mode: 'HTML' }).catch(() => {});
        }

    } catch (error) {
        console.error("❌ Erro no Radar V36:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro V36:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

// Roda a cada 30 minutos
setInterval(executarRadarV36, 1800000);
executarRadarV36();
