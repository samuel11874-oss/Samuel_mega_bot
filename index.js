const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Investigação Avançada v2 🔍⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function investigacaoProfunda() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [AUDITORIA V2] Iniciando diagnósticos de rede e DOM...");
        
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--single-process',
                '--window-size=1920,1080'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        // Monitora chamadas de rede para descobrir URLs de APIs ocultas
        const urlsSolicitadas = [];
        page.on('request', req => {
            const u = req.url();
            if (u.includes('totalcorner') && !u.endsWith('.png') && !u.endsWith('.css') && !u.endsWith('.js')) {
                urlsSolicitadas.push(`${req.method()} -> ${u}`);
            }
        });

        console.log("🌐 [AUDITORIA V2] Navegando para https://www.totalcorner.com/match/live ...");
        const response = await page.goto('https://www.totalcorner.com/match/live', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        const status = response ? response.status() : 'Sem Resposta';
        const titulo = await page.title();

        console.log(`📡 [HTTP STATUS]: ${status}`);
        console.log(`📄 [PÁGINA TÍTULO]: "${titulo}"`);

        console.log("⏳ Aguardando 8 segundos para renderização do DOM...");
        await new Promise(r => setTimeout(r, 8000));

        // Analisa o DOM da página em busca de tabelas e IDs
        const diagnosticoDOM = await page.evaluate(() => {
            const tabelas = Array.from(document.querySelectorAll('table')).map(t => ({
                id: t.id || 'sem-id',
                classes: t.className || 'sem-classe',
                qtdLinhas: t.querySelectorAll('tr').length
            }));

            const idsPartidas = Array.from(document.querySelectorAll('[data-match_id], tr[id]')).slice(0, 5).map(el => ({
                tag: el.tagName,
                id: el.id,
                dataMatchId: el.getAttribute('data-match_id'),
                textoAmos: el.innerText ? el.innerText.replace(/\s+/g, ' ').trim().substring(0, 100) : ''
            }));

            const corpoTexto = document.body ? document.body.innerText.substring(0, 500).replace(/\s+/g, ' ') : '';

            return {
                tabelas,
                idsPartidas,
                previewPagina: corpoTexto
            };
        });

        console.log("\n--- 📊 RESULTADO DA AUDITORIA ---");
        console.log(`📋 Tabelas Encontradas:`, JSON.stringify(diagnosticoDOM.tabelas, null, 2));
        console.log(`🔍 Amostra de Elementos de Jogos:`, JSON.stringify(diagnosticoDOM.idsPartidas, null, 2));
        console.log(`📝 Preview do Texto da Página:`, diagnosticoDOM.previewPagina);
        console.log(`🌐 Chamadas de Rede Relevantes (Últimas 10):`, urlsSolicitadas.slice(-10));
        console.log("---------------------------------\n");

        await bot.sendMessage(CHAT_ID, `🔍 *[Auditoria V2 Completa]*\nStatus HTTP: \`${status}\`\nTítulo: *${titulo}*\nConsulte o console do Render para ver a estrutura interna!`, { parse_mode: 'Markdown' }).catch(()=>{});

    } catch (error) {
        console.error("❌ Erro na auditoria v2:", error.message);
        bot.sendMessage(CHAT_ID, `❌ *Erro na Auditoria V2:* ${error.message}`, { parse_mode: 'Markdown' }).catch(()=>{});
    } finally {
        if (browser) await browser.close();
    }
}

// Executa o diagnóstico uma vez ao iniciar e repete a cada 10 minutos
setInterval(investigacaoProfunda, 600000);
investigacaoProfunda();
