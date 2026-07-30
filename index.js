const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V38 Espião Ao Vivo 🕵️‍♂️⚡</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarV38EspiaoAoVivo() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot V38 - ESPIÃO AO VIVO] Entrando em /match/live para inspecionar o HTML...");

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
        const response = await page.goto('https://www.totalcorner.com/match/live', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        const status = response ? response.status() : 0;
        const pageTitle = await page.title();
        console.log(`📡 Status HTTP: ${status} | Título: "${pageTitle}"`);

        console.log("⏳ Aguardando 8 segundos para o AJAX carregar os dados ao vivo...");
        await new Promise(r => setTimeout(r, 8000));

        const espiaoAoVivo = await page.evaluate(() => {
            const trs = Array.from(document.querySelectorAll('tr'));
            
            // Pega as primeiras 15 linhas da tabela para ver o que tem dentro
            const amostras = trs.slice(0, 15).map((tr, idx) => {
                let texto = tr.innerText.replace(/\s+/g, ' ').trim();
                let links = Array.from(tr.querySelectorAll('a')).map(a => a.getAttribute('href')).filter(h => h);
                return `Linha #${idx + 1} [Links: ${links.slice(0, 3).join(', ')}]: ${texto.substring(0, 120)}`;
            });

            // Pega o texto do corpo para garantir que a página carregou dados
            const textoBody = document.body.innerText.replace(/\s+/g, ' ').substring(0, 300);

            return {
                totalTRs: trs.length,
                amostras: amostras,
                textoBody: textoBody
            };
        });

        console.log(`\n================ RELATÓRIO DO ESPIÃO AO VIVO ================`);
        console.log(`🔍 Total de <tr> encontrados em /match/live: ${espiaoAoVivo.totalTRs}`);
        console.log(`📝 TEXTO DO CORPO:\n"${espiaoAoVivo.textoBody}"\n`);
        console.log(`👀 CONTEÚDO DAS PRIMEIRAS LINHAS:`);
        espiaoAoVivo.amostras.forEach(linha => console.log(linha));
        console.log(`=============================================================\n`);

        let msgTelegram = `🕵️‍♂️ <b>[ESPIÃO AO VIVO V38]</b>\n`;
        msgTelegram += `────────────────────────\n`;
        msgTelegram += `📡 <b>Status:</b> <code>${status}</code>\n`;
        msgTelegram += `📊 <b>Total de <tr>:</b> <code>${espiaoAoVivo.totalTRs}</code>\n`;
        msgTelegram += `────────────────────────\n`;
        msgTelegram += `⚠️ <i>Olhe o LOG do RENDER para ver o texto exato da tabela ao vivo!</i>`;

        await bot.sendMessage(CHAT_ID, msgTelegram, { parse_mode: 'HTML' }).catch(() => {});

    } catch (error) {
        console.error("❌ Erro no Espião V38:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

executarRadarV38EspiaoAoVivo();
