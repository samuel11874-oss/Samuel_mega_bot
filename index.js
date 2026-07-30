const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Base Limpa V17 🚀</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function radarResetV17() {
    let browser = null;
    try {
        console.log("🔄 [Bot V17 - Reset] Iniciando varredura limpa...");

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
        await page.setViewport({ width: 1366, height: 768 });

        console.log("🌐 Acessando TotalCorner Live...");
        const response = await page.goto('https://www.totalcorner.com/match/live', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        const status = response ? response.status() : 0;
        console.log(`📡 Status HTTP da Resposta: ${status}`);

        // Aguarda 6 segundos para a renderização limpa do JavaScript
        await new Promise(r => setTimeout(r, 6000));

        const jogosEncontrados = await page.evaluate(() => {
            const lista = [];
            // Captura as linhas de partidas reais do TotalCorner
            const linhas = document.querySelectorAll('tr[id^="tr_match_"]');

            linhas.forEach(row => {
                const homeNode = row.querySelector('.match_home');
                const awayNode = row.querySelector('.match_away');
                const statusNode = row.querySelector('.match_status_minutes, .match_status');
                const goalNode = row.querySelector('.match_goal');
                const cornerNode = row.querySelector('.match_corner');

                const home = homeNode ? homeNode.innerText.trim().split('\n')[0] : '';
                const away = awayNode ? awayNode.innerText.trim().split('\n')[0] : '';
                const tempo = statusNode ? statusNode.innerText.trim() : 'LIVE';
                const placar = goalNode ? goalNode.innerText.trim() : '0 - 0';
                const escanteios = cornerNode ? cornerNode.innerText.trim() : '0 - 0';

                if (home && away) {
                    lista.push({ home, away, tempo, placar, escanteios });
                }
            });

            return lista;
        });

        console.log(`⚽ Total de jogos extraídos da página: ${jogosEncontrados.length}`);

        if (jogosEncontrados.length > 0) {
            console.log(`📝 Exemplo da 1ª partida: ${jogosEncontrados[0].home} x ${jogosEncontrados[0].away} [${jogosEncontrados[0].tempo}]`);
            
            // Envia um primeiro lote de até 10 jogos no Telegram para confirmar o funcionamento
            const limite = Math.min(jogosEncontrados.length, 10);
            for (let i = 0; i < limite; i++) {
                const j = jogosEncontrados[i];
                let msg = `🛸 <b>[ RADAR BASE V17 ]</b> (#${i+1})\n`;
                msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                msg += `⚽ <b>${j.home} x ${j.away}</b>\n`;
                msg += `⏱️ <b>Status/Minuto:</b> <code>${j.tempo}</code>\n`;
                msg += `📊 <b>Placar:</b> <code>${j.placar}</code>\n`;
                msg += `🚩 <b>Escanteios:</b> <code>${j.escanteios}</code>\n`;
                msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                msg += `🤖 <i>Samuel Mega Bot • Teste de Base</i>`;

                await bot.sendMessage(CHAT_ID, msg, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 600));
            }
            console.log(`✅ ${limite} cards enviados com sucesso ao Telegram!`);
        } else {
            console.log("⚠️ Nenhuma linha tr_match_ encontrada na tabela.");
        }

    } catch (err) {
        console.error("❌ Erro na V17:", err.message);
    } finally {
        if (browser) await browser.close();
    }
}

// Executa a cada 5 minutos
setInterval(radarResetV17, 300000);
radarResetV17();
