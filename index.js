const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V35 O Espião 🕵️‍♂️</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarV35Espiao() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot V35 - O ESPIÃO] Entrando no site para ler o texto bruto...");

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
        console.log(`📡 Status HTTP: ${status} | Título: "${pageTitle}"`);

        await new Promise(r => setTimeout(r, 6000));

        // ==========================================
        // 🕵️‍♂️ MÓDULO ESPIÃO: O QUE O ROBÔ ESTÁ VENDO?
        // ==========================================
        const espiao = await page.evaluate(() => {
            const trs = Array.from(document.querySelectorAll('tr'));
            
            // Pega o texto limpo das primeiras 15 linhas para descobrirmos o que são
            const amostras = trs.slice(0, 15).map((tr, idx) => {
                let texto = tr.innerText.replace(/\s+/g, ' ').trim();
                return `Linha #${idx + 1}: ${texto.substring(0, 100)}`;
            });

            // Pega as primeiras 200 palavras do site para ver se é página de bloqueio
            const textoSite = document.body.innerText.replace(/\s+/g, ' ').substring(0, 250);

            return {
                totalTRs: trs.length,
                amostras: amostras,
                textoSite: textoSite
            };
        });

        console.log(`\n================ RELATÓRIO DO ESPIÃO ================`);
        console.log(`🔍 Total de <tr> encontrados: ${espiao.totalTRs}`);
        console.log(`📝 TEXTO PRINCIPAL DO SITE:\n"${espiao.textoSite}"\n`);
        console.log(`👀 O QUE TEM NAS PRIMEIRAS LINHAS DA TABELA:`);
        espiao.amostras.forEach(linha => console.log(linha));
        console.log(`=====================================================\n`);

        let msgTelegram = `🕵️‍♂️ <b>[RELATÓRIO ESPIÃO V35]</b>\n`;
        msgTelegram += `────────────────────────\n`;
        msgTelegram += `📡 <b>Status:</b> <code>${status}</code>\n`;
        msgTelegram += `📄 <b>Título:</b> <code>${pageTitle}</code>\n`;
        msgTelegram += `📊 <b>Total de Linhas (TR):</b> <code>${espiao.totalTRs}</code>\n`;
        msgTelegram += `────────────────────────\n`;
        msgTelegram += `<b>Texto do Site:</b> <i>${espiao.textoSite.substring(0, 100)}...</i>\n`;
        msgTelegram += `────────────────────────\n`;
        msgTelegram += `⚠️ <i>Olhe o LOG do RENDER para ver o conteúdo exato das tabelas e descobrir o erro!</i>`;

        await bot.sendMessage(CHAT_ID, msgTelegram, { parse_mode: 'HTML' }).catch(() => {});

    } catch (error) {
        console.error("❌ Erro no Radar V35:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

// Roda 1 vez para investigar
executarRadarV35Espiao();
