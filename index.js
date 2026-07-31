const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Live Direto ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const jogosEnviados = new Set();

async function executarRadarLive() {
    let browser = null;
    try {
        console.log("⚡ [Radar Live] Iniciando navegador...");

        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-zygote',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36');
        await page.setViewport({ width: 375, height: 812, isMobile: true });

        console.log("🌐 Acessando SokkerPRO Mobile...");
        await page.goto('https://m.sokkerpro.com/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log("⏳ Aguardando renderização completa da aplicação...");
        await new Promise(r => setTimeout(r, 8000));

        // Clica na aba de jogos ao vivo para garantir que os dados apareçam na tela
        await page.evaluate(() => {
            const elementos = Array.from(document.querySelectorAll('div, span, p'));
            const abaAoVivo = elementos.find(el => el.innerText && el.innerText.includes('AO VIVO'));
            if (abaAoVivo) {
                abaAoVivo.click();
            }
        });

        console.log("⏳ Aguardando carregamento da aba ao vivo e rolando a tela...");
        await new Promise(r => setTimeout(r, 4000));

        // Rola a página para baixo para carregar todos os blocos de jogos
        for (let i = 0; i < 5; i++) {
            await page.evaluate(() => window.scrollBy(0, 1000));
            await new Promise(r => setTimeout(r, 1500));
        }

        // Extração profunda dos blocos de partidas ao vivo
        const partidas = await page.evaluate(() => {
            const lista = [];
            const blocos = document.querySelectorAll('div');

            blocos.forEach(el => {
                // Filtra apenas blocos que parecem conter o card de um jogo
                const texto = el.innerText ? el.innerText.replace(/\s+/g, ' ').trim() : '';

                if ((texto.includes(' - ') || texto.includes(':')) && texto.length > 15 && texto.length < 350) {
                    const lower = texto.toLowerCase();
                    
                    // Verifica se tem indicadores claros de jogo ao vivo (minutos, HT, FT)
                    const temAoVivo = /\b(ht|ft|\d{1,2}\s*['′])\b/i.test(lower);
                    const ehSub = /sub\s*-?(19|20|21)|u\s*-?(19|20|21)/i.test(lower);
                    const ehFem = /\(w\)|\bwomen\b|feminino|\(f\)/i.test(lower);

                    if (temAoVivo && !ehSub && !ehFem) {
                        const chave = texto.substring(0, 35);
                        if (!lista.some(p => p.chave === chave)) {
                            lista.push({ chave, texto });
                        }
                    }
                }
            });

            return lista;
        });

        console.log(`📊 Partidas ao vivo capturadas: ${partidas.length}`);

        const novas = partidas.filter(p => !jogosEnviados.has(p.chave));

        if (novas.length > 0) {
            let msg = `⚽ <b>RADAR SOKKERPRO - AO VIVO</b>\n`;
            msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

            let count = 1;
            for (const p of novas) {
                jogosEnviados.add(p.chave);

                let card = `🔴 <b>Partida #${count}</b>\n`;
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

            console.log("✅ Alertas ao vivo enviados para o Telegram!");
        } else {
            console.log("ℹ️ Nenhum jogo novo nesta varredura.");
        }

    } catch (erro) {
        console.error("❌ Erro na varredura ao vivo:", erro.message);
    } finally {
        if (browser) await browser.close();
    }
}

executarRadarLive();
setInterval(executarRadarLive, 180000);
