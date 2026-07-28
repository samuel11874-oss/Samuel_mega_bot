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
        console.log("🕵️‍♂️ [Bot Live] Iniciando varredura com carregamento profundo...");
        
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
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });

        console.log("🌐 [Bot Live] Acessando Soccerway...");
        await page.goto('https://br.soccerway.com/livescores/', {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        // Simula rolagem para forçar o carregamento dinâmico das partidas
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 300;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= scrollHeight || totalHeight > 1500) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 200);
            });
        });

        // Aguarda 5 segundos extras após a rolagem
        await new Promise(r => setTimeout(r, 5000));

        // Extrai todo o texto da página referente a jogos
        const dadosJogos = await page.evaluate(() => {
            const linhas = Array.from(document.querySelectorAll('tr, div, article'));
            const partidas = [];

            linhas.forEach(el => {
                const txt = el.innerText ? el.innerText.trim() : '';
                // Procura por blocos que contêm padrão de placar ex: "1 - 0" ou "VS" ou minutos
                if (txt.includes('\n') && (txt.match(/\d+\s*[-x:]\s*\d+/) || txt.includes("'"))) {
                    partidas.push(txt.replace(/\n+/g, ' | '));
                }
            });

            return [...new Set(partidas)].filter(p => p.length > 8 && p.length < 120);
        });

        console.log(`⚽ [Bot Live] Total de jogos filtrados: ${dadosJogos.length}`);

        if (dadosJogos.length > 0) {
            let msg = `🔴 *JOGOS CAPTURADOS (${dadosJogos.length})*\n\n`;
            dadosJogos.slice(0, 10).forEach((j, i) => {
                msg += `📌 *${i + 1}:* ${j}\n\n`;
            });
            bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(()=>{});
        } else {
            // Caso não ache, extrai trecho do HTML para diagnosticar o que foi renderizado
            const htmlPreview = await page.evaluate(() => document.body.innerText.substring(0, 300));
            console.log("Prévia do conteúdo da página:", htmlPreview);
            bot.sendMessage(CHAT_ID, `⚠️ *Página carregou, mas sem jogos visíveis.*\nPrévia: ${htmlPreview.replace(/\n/g, ' ')}`, { parse_mode: 'Markdown' }).catch(()=>{});
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
