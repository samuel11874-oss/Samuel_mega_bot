const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Scanner Ativo ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function buscarJogosAoVivo() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot Live] Iniciando varredura geral de partidas...");
        
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1');
        await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

        console.log("🌐 [Bot Live] Acessando Soccerway...");
        await page.goto('https://br.soccerway.com/livescores/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        // Espera 6 segundos para a renderização do JS carregar os dados na tela
        await new Promise(r => setTimeout(r, 6000));

        // Leitura ampla de linhas de jogos e blocos no DOM
        const resultados = await page.evaluate(() => {
            const extraidos = [];
            
            // Varre todas as linhas e elementos que contenham texto de jogo
            const elementos = document.querySelectorAll('tr, .match, .match-row, [class*="match"]');

            elementos.forEach(el => {
                const texto = el.innerText ? el.innerText.trim() : '';
                // Filtra blocos de texto que possuem quebras de linha e dados de partidas
                if (texto.includes('\n') && texto.length > 5 && texto.length < 150) {
                    const linhas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    if (linhas.length >= 2) {
                        extraidos.push(linhas.join(' | '));
                    }
                }
            });

            // Remove duplicados
            return [...new Set(extraidos)];
        });

        console.log(`⚽ [Bot Live] Elementos de partidas encontrados: ${resultados.length}`);

        if (resultados.length > 0) {
            let mensagem = `🔴 *JOGOS / EVENTOS CAPTURADOS (${resultados.length})*\n\n`;
            resultados.slice(0, 10).forEach((item, index) => {
                mensagem += `📌 *Jogo ${index + 1}:*\n${item}\n\n`;
            });

            bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(()=>{});
        } else {
            // Em último caso, extrai o título e o status para diagnosticar a tela
            const titulo = await page.title();
            bot.sendMessage(CHAT_ID, `⚠️ *Varredura finalizada sem linhas explícitas.*\nTítulo carregado: ${titulo}`, { parse_mode: 'Markdown' }).catch(()=>{});
        }

    } catch (error) {
        console.error("❌ Erro ao buscar jogos:", error.message);
        bot.sendMessage(CHAT_ID, `❌ *Erro na busca:* ${error.message}`, { parse_mode: 'Markdown' }).catch(()=>{});
    } finally {
        if (browser) await browser.close();
    }
}

// Roda a cada 10 minutos
setInterval(buscarJogosAoVivo, 600000);
buscarJogosAoVivo();
