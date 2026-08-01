const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Modo Investigação Total 🕵️‍♂️⚽</h2>'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Servidor HTTP rodando na porta ${PORT}`));

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function investigarPagina() {
    console.log("\n==================================================");
    console.log("🕵️‍♂️ [INVESTIGAÇÃO] Iniciando varredura forense...");
    let browser = null;
    try {
        console.log("🚀 [INVESTIGAÇÃO] Lançando o navegador...");
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36');

        console.log("🌐 [INVESTIGAÇÃO] Acessando https://m.sokkerpro.com/ ...");
        await page.goto('https://m.sokkerpro.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        console.log("⏳ [INVESTIGAÇÃO] Aguardando 8 segundos para scripts carregarem...");
        await new Promise(r => setTimeout(r, 8000));

        // 1. Título da página
        const titulo = await page.title();
        console.log(`📌 [INVESTIGAÇÃO] Título da página atual: "${titulo}"`);

        // 2. URL atual (caso tenha redirecionado)
        const urlAtual = page.url();
        console.log(`🔗 [INVESTIGAÇÃO] URL atual no navegador: "${urlAtual}"`);

        // 3. Listar todos os inputs encontrados na página para ver se há campos ocultos ou de login
        const inputsInfo = await page.evaluate(() => {
            let lista = [];
            document.querySelectorAll('input').forEach(i => {
                lista.push({ type: i.type, name: i.name, placeholder: i.placeholder, id: i.id });
            });
            return lista;
        });
        console.log(`🔍 [INVESTIGAÇÃO] Inputs encontrados na página:`, JSON.stringify(inputsInfo, null, 2));

        // 4. Listar todos os botões encontrados
        const botoesInfo = await page.evaluate(() => {
            let lista = [];
            document.querySelectorAll('button, a, input[type="submit"]').forEach(b => {
                let txt = b.innerText || b.value || '';
                if (txt.trim().length > 0) lista.push(txt.trim().substring(0, 30));
            });
            return lista.slice(0, 15); // Primeiros 15 botões/links
        });
        console.log(`🔘 [INVESTIGAÇÃO] Botões/Links visíveis (amostra):`, botoesInfo);

        // 5. Capturar uma amostra do texto total da página para inspecionar
        const amostraTexto = await page.evaluate(() => {
            return document.body ? document.body.innerText.replace(/\s+/g, ' ').substring(0, 500) : 'Corpo vazio';
        });
        console.log(`📄 [INVESTIGAÇÃO] Amostra do texto visível na tela:\n"""\n${amostraTexto}\n"""`);

        console.log("==================================================\n");

    } catch (erro) {
        console.error(`❌ [INVESTIGAÇÃO CRÍTICA] Erro: ${erro.message}`);
    } finally {
        if (browser) await browser.close();
    }
}

investigarPagina();
setInterval(investigarPagina, 120000);
