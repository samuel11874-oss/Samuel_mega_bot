const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

// Ativa o plugin de stealth para ocultar rastros de automação
puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Investigador Soccerway ⚽🕵️‍♂️</h2><p>Modo de investigação de proteção e raspagem avançada ativo.</p>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Script de Investigação e Raspagem Avançada para Soccerway
async function investigarEBurlarSoccerway() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Investigação] Iniciando navegador com emulação móvel e Stealth...");
        
        browser = await puppeteer.launch({
            headless: true,
            // Caminho exato onde o Chrome foi baixado no Render
            executablePath: '/opt/render/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();

        // 1. Emulação rigorosa de Dispositivo Móvel (Celular real)
        await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');
        await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

        // 2. Cabeçalhos HTTP customizados
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
        });

        console.log("🌐 Acessando o Soccerway para investigação de segurança...");
        const response = await page.goto('https://br.soccerway.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        // 3. Código de Investigação: Análise de Resposta
        const status = response.status();
        const bodyTexto = await page.evaluate(() => document.body.innerText);
        const tituloPagina = await page.title();

        console.log(`📊 [Investigação] Status HTTP: ${status}`);
        console.log(`📌 [Investigação] Título capturado: ${tituloPagina}`);

        // Verificação de barreiras de proteção (Cloudflare / Bloqueio)
        if (bodyTexto.includes('Verifying you are human') || bodyTexto.includes('Cloudflare') || status === 403 || status === 503) {
            console.warn("⚠️ [Investigação] Alerta: O Soccerway barrou o acesso com tela de proteção.");
            bot.sendMessage(CHAT_ID, `⚠️ *Soccerway - Alerta de Bloqueio:*\nStatus HTTP: ${status}\nO site exigiu verificação humana. Ajustando estratégias de bypass.`, { parse_mode: 'Markdown' }).catch(()=>{});
        } else {
            console.log("✅ [Investigação] Acesso liberado sem barreiras de Cloudflare!");
            bot.sendMessage(CHAT_ID, `✅ *Soccerway Acessado com Sucesso!*\nTítulo: ${tituloPagina}`, { parse_mode: 'Markdown' }).catch(()=>{});

            // 4. Varredura de dados na página (Exemplo de extração)
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

// Executa a investigação a cada 1 hora e na inicialização
setInterval(investigarEBurlarSoccerway, 3600000);
investigarEBurlarSoccerway();
