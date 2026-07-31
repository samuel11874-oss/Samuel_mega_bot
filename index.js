const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Cards Organizados ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const jogosEnviados = new Set();

async function monitorarJogosAoVivo() {
    let browser = null;
    try {
        console.log("⚡ Iniciando varredura organizada no SokkerPRO...");

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

        // Extração cirúrgica para quebrar a página em partidas individuais limpas
        const partidas = await page.evaluate(() => {
            const lista = [];
            // Busca elementos menores que representam linhas ou cards individuais de jogos na versão mobile
            const elementos = document.querySelectorAll('div');

            elementos.forEach(el => {
                const texto = el.innerText ? el.innerText.replace(/\s+/g, ' ').trim() : '';

                // Valida se o bloco possui estrutura de um único jogo (contém confronto e status ao vivo)
                if ((texto.includes(' - ') || texto.includes(':')) && texto.length > 15 && texto.length < 200) {
                    const textoLower = texto.toLowerCase();
                    const aoVivo = /\b(ht|ft|\d{1,2}\s*['′])\b/i.test(textoLower);
                    const sub = /sub\s*-?(19|20|21)|u\s*-?(19|20|21)/i.test(textoLower);
                    const fem = /\(w\)|\bwomen\b|feminino|\(f\)/i.test(textoLower);

                    // Garante que é um card unitário de jogo ao vivo válido
                    if (aoVivo && !sub && !fem && !texto.includes('TODOS') && !texto.includes('AO VIVO')) {
                        const chave = texto.substring(0, 30);
                        if (!lista.some(p => p.chave === chave)) {
                            lista.push({ chave, texto });
                        }
                    }
                }
            });

            return lista;
        });

        const novasPartidas = partidas.filter(p => !jogosEnviados.has(p.chave));

        console.log(`📊 Jogos unitários encontrados: ${partidas.length} | Novos para envio: ${novasPartidas.length}`);

        if (novasPartidas.length > 0) {
            let contador = 1;
            for (const partida of novasPartidas) {
                jogosEnviados.add(partida.chave);

                // Cada partida é enviada em seu próprio card isolado, limpo e moderno
                let card = `⚽ <b>RADAR SOKKERPRO</b>\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `🔴 <b>Status / Minuto:</b> ${partida.texto}\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 1200)); // Intervalo curto para evitar flood no Telegram
                contador++;
            }

            console.log("✅ Cards individuais enviados com sucesso ao Telegram!");
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
