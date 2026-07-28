const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

// Aplica o plugin de camuflagem avançada
puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Operacional e Camuflado ⚽🕵️‍♂️</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Lista de perfis de navegadores reais para alternar e evitar padrões
const USER_AGENTS = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.118 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.119 Mobile Safari/537.36'
];

function tempoAleatorio(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

async function investigarEBurlarSoccerway() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot Camuflado] Iniciando sessão com proteção máxima anti-bloqueio...");
        
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--single-process',
                '--disable-blink-features=AutomationControlled' // Desativa flags de automação
            ]
        });

        const page = await browser.newPage();

        // 1. Alterna User-Agent de forma aleatória
        const userAgentSorteado = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
        await page.setUserAgent(userAgentSorteado);

        // 2. Simula tela de smartphone moderno
        await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

        // 3. Mascara propriedades de automação
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US'] });
        });

        await page.setExtraHTTPHeaders({
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
        });

        console.log("🌐 [Bot Camuflado] Acessando o Soccerway...");
        const response = await page.goto('https://br.soccerway.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        // 4. Pausa tática parecida com tempo de reação humano
        const tempoEspera = tempoAleatorio(2000, 5000);
        console.log(`⏱️ [Bot Camuflado] Simulando tempo humano na página (${tempoEspera}ms)...`);
        await new Promise(r => setTimeout(r, tempoEspera));

        const status = response.status();
        const tituloPagina = await page.title();
        const bodyTexto = await page.evaluate(() => document.body.innerText);

        console.log(`📊 Status HTTP: ${status} | 📌 Título: ${tituloPagina}`);

        if (bodyTexto.includes('Verifying you are human') || bodyTexto.includes('Cloudflare') || status === 403) {
            console.warn("⚠️ [Bot Camuflado] Bloqueio detectado.");
            bot.sendMessage(CHAT_ID, `⚠️ *Soccerway - Bloqueio Detectado:*\nStatus: ${status}\nO site acionou a proteção.`, { parse_mode: 'Markdown' }).catch(()=>{});
        } else {
            console.log("✅ [Bot Camuflado] Acesso bem-sucedido e imperceptível!");
            bot.sendMessage(CHAT_ID, `✅ *Soccerway - Camuflagem 100% Ativa!*\nStatus: ${status}\nTítulo: ${tituloPagina}`, { parse_mode: 'Markdown' }).catch(()=>{});
        }

    } catch (error) {
        console.error("❌ Erro:", error.message);
        bot.sendMessage(CHAT_ID, `❌ *Erro no Bot:* ${error.message}`, { parse_mode: 'Markdown' }).catch(()=>{});
    } finally {
        if (browser) await browser.close();
    }
}

// Executa a cada 1 hora para manter a checagem ativa
setInterval(investigarEBurlarSoccerway, 3600000);
investigarEBurlarSoccerway();
