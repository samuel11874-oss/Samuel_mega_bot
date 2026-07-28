const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Investigador Soccerway ⚽🕵️‍♂️</h2><p>Modo de investigação de proteção e raspagem avançada ativo.</p>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function investigarEBurlarSoccerway() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Investigação] Iniciando navegador com detecção automática, emulação móvel e Stealth...");
        
        // Deixa o Puppeteer encontrar o caminho do Chrome automaticamente
        browser = await puppeteer.launch({
            headless: true,
            executablePath: puppeteer.executablePath(),
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();

        await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');
        await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

        await page.setExtraHTTPHeaders({
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
        });

        console.log("🌐 Acessando o Soccerway para investigação de segurança...");
        const response = await page.goto('https://br.soccerway.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        const status = response.status();
        const bodyTexto = await page.evaluate(() => document.body.innerText);
        const tituloPagina = await page.title();

        console.log(`📊 [Investigação] Status HTTP: ${status}`);
        console.log(`📌 [Investigação] Título capturado: ${tituloPagina}`);

        if (bodyTexto.includes('Verifying you are human') || bodyTexto.includes('Cloudflare') || status === 403 || status === 503) {
            console.warn("⚠️ [Investigação] Alerta: O Soccerway barrou o acesso com tela de proteção.");
            bot.sendMessage(CHAT_ID, `⚠️ *Soccerway - Alerta de Bloqueio:*\nStatus HTTP: ${status}\nO site exigiu verificação humana. Ajustando estratégias de bypass.`, { parse_mode: 'Markdown' }).catch(()=>{});
        } else {
            console.log("✅ [Investigação] Acesso liberado sem barreiras de Cloudflare!");
            bot.sendMessage(CHAT_ID, `✅ *Soccerway Acessado com Sucesso!*\nTítulo: ${tituloPagina}`, { parse_mode: 'Markdown' }).catch(()=>{});

            const partidasEncontradas = await page.evaluate(() => {
                const lista = [];
                document.querySelectorAll('.match-item, tr.match, div.match').forEach(el => {
                    lista.push(el.innerText.trim());
                });
                return lista.slice(0, 10);
            });

            if (partidasEncontradas.length > 0) {
                console.log(`⚽ [Investigação] Encontrados ${partidasEncontradas.length} elementos de partidas.`);
            } else {
                console.log("ℹ️ [Investigação] Nenhum elemento de partida visível no seletor atual.");
            }
        }

    } catch (error) {
        console.error("❌ Erro na execução do script de investigação:", error.message);
        bot.sendMessage(CHAT_ID, `❌ *Erro no Script de Investigação:* ${error.message}`, { parse_mode: 'Markdown' }).catch(()=>{});
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

setInterval(investigarEBurlarSoccerway, 3600000);
investigarEBurlarSoccerway();
