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
        console.log("🕵️‍♂️ [Bot US] Iniciando varredura no domínio global...");
        
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
        
        // Simula navegador desktop padrão em inglês para evitar bloqueio geográfico de datacenter
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1366, height: 768 });

        console.log("🌐 [Bot US] Acessando https://us.soccerway.com/ ...");
        const response = await page.goto('https://us.soccerway.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        // Aguarda 6 segundos para carregamento dos blocos de partidas na home
        await new Promise(r => setTimeout(r, 6000));

        // Extrai o conteúdo real de jogos carregados no DOM
        const partidas = await page.evaluate(() => {
            const lista = [];
            // Seleciona linhas de partidas da estrutura global
            const elementos = document.querySelectorAll('tr.match, .match-row, tr');

            elementos.forEach(el => {
                const texto = el.innerText ? el.innerText.trim() : '';
                if (texto.length > 5 && (texto.includes('-') || texto.includes(':') || /\d+/.test(texto))) {
                    const limpo = texto.replace(/\n+/g, ' | ');
                    if (!lista.includes(limpo) && limpo.length < 150) {
                        lista.push(limpo);
                    }
                }
            });

            return lista;
        });

        console.log(`⚽ [Bot US] Total de partidas extraídas: ${partidas.length}`);

        if (partidas.length > 0) {
            let msg = `🔴 *JOGOS ENCONTRADOS (Soccerway Global - ${partidas.length})*\n\n`;
            partidas.slice(0, 12).forEach((p, i) => {
                msg += `📌 *${i + 1}:* ${p}\n\n`;
            });
            bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(()=>{});
        } else {
            const titulo = await page.title();
            const textoInicio = await page.evaluate(() => document.body.innerText.substring(0, 200));
            console.log("Prévia da página:", textoInicio);
            bot.sendMessage(CHAT_ID, `⚠️ *Acesso OK, mas sem jogos mapeados na home.*\nTítulo: ${titulo}\nPrévia: ${textoInicio.replace(/\n/g, ' ')}`, { parse_mode: 'Markdown' }).catch(()=>{});
        }

    } catch (error) {
        console.error("❌ Erro:", error.message);
        bot.sendMessage(CHAT_ID, `❌ *Erro no Bot:* ${error.message}`, { parse_mode: 'Markdown' }).catch(()=>{});
    } finally {
        if (browser) await browser.close();
    }
}

setInterval(buscarJogosAoVivo, 600000);
buscarJogosAoVivo();
