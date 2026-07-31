const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Fast Radar ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const jogosEnviados = new Set();

async function executarRadarRapido() {
    let browser = null;
    try {
        console.log("⚡ [Radar] Iniciando navegador otimizado...");

        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-zygote',
                '--single-process',
                '--disable-extensions',
                '--disable-accelerated-2d-canvas'
            ]
        });

        const page = await browser.newPage();
        
        // Define um user-agent real para evitar bloqueios de conexão
        await page.setUserAgent('Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36');

        console.log("🌐 Conectando leve ao SokkerPRO...");
        // Usa domcontentloaded para não travar esperando scripts lentos de terceiros
        await page.goto('https://m.sokkerpro.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        console.log("⏳ Aguardando os dados ao vivo carregarem...");
        await new Promise(r => setTimeout(r, 5000));

        // Rola levemente para baixo para puxar os cards
        await page.evaluate(() => window.scrollBy(0, 800));
        await new Promise(r => setTimeout(r, 2000));

        // Extrai os blocos de jogos limpos direto da tela principal
        const partidas = await page.evaluate(() => {
            const lista = [];
            const blocos = document.querySelectorAll('div, tr');

            blocos.forEach(el => {
                const texto = el.innerText ? el.innerText.replace(/\s+/g, ' ').trim() : '';

                // Valida se o bloco parece um jogo com placar/minuto
                if ((texto.includes(' - ') || texto.includes(':')) && texto.length > 12 && texto.length < 300) {
                    const lower = texto.toLowerCase();
                    const temTempo = /\b(ht|ft|\d{1,2}\s*['′])\b/i.test(lower);
                    const ehSub = /sub\s*-?(19|20|21)|u\s*-?(19|20|21)/i.test(lower);
                    const ehFem = /\(w\)|\bwomen\b|feminino|\(f\)/i.test(lower);

                    if (temTempo && !ehSub && !ehFem) {
                        const chave = texto.substring(0, 30);
                        if (!lista.some(p => p.chave === chave)) {
                            lista.push({ chave, texto });
                        }
                    }
                }
            });

            return lista;
        });

        console.log(`📊 Partidas ao vivo capturadas com sucesso: ${partidas.length}`);

        const novas = partidas.filter(p => !jogosEnviados.has(p.chave));

        if (novas.length > 0) {
            let msg = `⚽ <b>RADAR SOKKERPRO - AO VIVO</b>\n`;
            msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

            let count = 1;
            for (const p of novas) {
                jogosEnviados.add(p.chave);

                let card = `🔴 <b>Jogo #${count}</b>\n`;
                card += `<code>${p.texto}</code>\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

                if ((msg.length + card.length) > 3800) {
                    await bot.sendMessage(CHAT_ID, msg, { parse_mode: 'HTML' }).catch(() => {});
                    await new Promise(r => setTimeout(r, 1000));
                    msg = `⚽ <b>CONTINUAÇÃO</b>\n━━━━━━━━━━━━━━━━━━━━━━\n\n` + card;
                } else {
                    msg += card;
                }
                count++;
            }

            if (msg.trim().length > 0) {
                await bot.sendMessage(CHAT_ID, msg, { parse_mode: 'HTML' }).catch(() => {});
            }

            console.log("✅ Alertas enviados para o Telegram!");
        } else {
            console.log("ℹ️ Nenhum jogo novo nesta checagem rápida.");
        }

    } catch (erro) {
        console.error("❌ Erro na varredura rápida:", erro.message);
    } finally {
        if (browser) await browser.close();
    }
}

executarRadarRapido();
setInterval(executarRadarRapido, 180000); // Roda a cada 3 minutos sem travamentos
