const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V41 Investigador Total 🕵️‍♂️</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarInvestigacaoTotal() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot V41 - INVESTIGAÇÃO TOTAL] Iniciando auditoria profunda em /match/live...");

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

        console.log("⏳ Aguardando 10 segundos para scripts assíncronos e abas...");
        await new Promise(r => setTimeout(r, 10000));

        // Executa a auditoria completa do DOM da página ao vivo
        const auditoria = await page.evaluate(() => {
            // 1. Pega todas as tabelas e suas classes/IDs
            const tabelas = Array.from(document.querySelectorAll('table')).map((t, i) => ({
                index: i + 1,
                id: t.id || 'sem-id',
                className: t.className || 'sem-classe',
                linhasCount: t.querySelectorAll('tr').length
            }));

            // 2. Pega todos os botões ou abas (tabs) clicáveis
            const botoesOuAbas = Array.from(document.querySelectorAll('a, button, .tab, li')).map(el => el.innerText.trim()).filter(txt => txt.length > 0 && txt.length < 30);

            // 3. Amostra de todas as linhas de tabela existentes
            const todasAsLinhas = Array.from(document.querySelectorAll('tr')).slice(0, 25).map((tr, idx) => {
                return `TR #${idx + 1}: ${tr.innerText.replace(/\s+/g, ' ').substring(0, 150)}`;
            });

            // 4. Texto completo resumido do corpo da página
            const bodyText = document.body.innerText.replace(/\s+/g, ' ').substring(0, 600);

            return {
                tabelas: tabelas,
                botoesOuAbas: Array.from(new Set(botoesOuAbas)).slice(0, 35),
                todasAsLinhas: todasAsLinhas,
                bodyText: bodyText
            };
        });

        console.log("\n================ 🔬 RELATÓRIO DE INVESTIGAÇÃO TOTAL ================");
        console.log(`📊 Tabelas Encontradas (${auditoria.tabelas.length}):`);
        auditoria.tabelas.forEach(t => {
            console.log(`   - Tabela #${t.index} | ID: "${t.id}" | Classe: "${t.className}" | Linhas (tr): ${t.linhasCount}`);
        });

        console.log(`\n🔘 Botões/Abas/Links Encontrados (Amostra):`);
        console.log(auditoria.botoesOuAbas.join(' | '));

        console.log(`\n📝 Amostra das Primeiras Linhas da Página:`);
        auditoria.todasAsLinhas.forEach(l => console.log(`   ${l}`));

        console.log(`\n📄 Texto do Corpo (Resumo):`);
        console.log(`"${auditoria.bodyText}"`);
        console.log("=====================================================================\n");

        await bot.sendMessage(CHAT_ID, `🕵️‍♂️ <b>[INVESTIGAÇÃO V41 CONCLUÍDA]</b>\n📊 Tabelas: ${auditoria.tabelas.length}\n📄 Verifique o console do Render para o raio-X completo!`, { parse_mode: 'HTML' }).catch(() => {});

    } catch (error) {
        console.error("❌ Erro na Investigação V41:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro V41:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

executarInvestigacaoTotal();
