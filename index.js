const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot de Escanteios - SokkerPRO ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const jogosEnviados = new Set();

async function monitorarJogosAoVivo() {
    let browser = null;
    try {
        console.log("⚡ Iniciando varredura no SokkerPRO...");

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
        
        await page.goto('https://m.sokkerpro.com/', {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        await new Promise(r => setTimeout(r, 6000));

        for (let i = 0; i < 4; i++) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await new Promise(r => setTimeout(r, 2000));
        }

        const partidas = await page.evaluate(() => {
            const lista = [];
            const blocos = document.querySelectorAll('div, tr');

            blocos.forEach(el => {
                const texto = el.innerText ? el.innerText.replace(/\s+/g, ' ').trim() : '';

                if ((texto.includes(' - ') || texto.includes(':')) && texto.length > 10 && texto.length < 350) {
                    const textoLower = texto.toLowerCase();
                    const aoVivo = /\b(ht|ft|\d{1,2}\s*['′])\b/i.test(textoLower);
                    const sub = /sub\s*-?(19|20|21)|u\s*-?(19|20|21)/i.test(textoLower);
                    const fem = /\(w\)|\bwomen\b|feminino|\(f\)/i.test(textoLower);

                    if (aoVivo && !sub && !fem) {
                        const chave = texto.substring(0, 35);
                        if (!lista.some(p => p.chave === chave)) {
                            lista.push({ chave, texto });
                        }
                    }
                }
            });

            return lista;
        });

        const novasPartidas = partidas.filter(p => !jogosEnviados.has(p.chave));

        console.log(`📊 Encontrados: ${partidas.length} | Novos para envio: ${novasPartidas.length}`);

        if (novasPartidas.length > 0) {
            let mensagem = `⚽ <b>RADAR AO VIVO - SOLETA</b>\n`;
            mensagem += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

            let contador = 1;
            for (const partida of novasPartidas) {
                jogosEnviados.add(partida.chave);

                let card = `🔴 <b>Partida #${contador}</b>\n`;
                card += `<code>${partida.texto}</code>\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
                
                if ((mensagem.length + card.length) > 3800) {
                    await bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'HTML' }).catch(() => {});
                    await new Promise(r => setTimeout(r, 1000));
                    mensagem = `⚽ <b>CONTINUAÇÃO</b>\n━━━━━━━━━━━━━━━━━━━━━━\n\n` + card;
                } else {
                    mensagem += card;
                }
                contador++;
            }

            if (mensagem.trim().length > 0) {
                await bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'HTML' }).catch(() => {});
            }

            console.log("✅ Alerta enviado com sucesso ao Telegram!");
        }

    } catch (erro) {
        console.error("❌ Erro no monitoramento:", erro.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro:</b> <code>${erro.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

monitorarJogosAoVivo();
setInterval(monitorarJogosAoVivo, 180000);
