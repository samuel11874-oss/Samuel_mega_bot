const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Monitor Avançado Pro ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function buscarJogosAoVivo() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot Pro] Iniciando varredura profunda de partidas e estatísticas...");
        
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
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1366, height: 768 });

        console.log("🌐 [Bot Pro] Acessando us.soccerway.com...");
        await page.goto('https://us.soccerway.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        await new Promise(r => setTimeout(r, 4000));
        
        // Clica na aba LIVE
        try {
            await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a, span, div'));
                const abaLive = links.find(el => el.innerText && el.innerText.trim() === 'LIVE');
                if (abaLive) abaLive.click();
            });
            await new Promise(r => setTimeout(r, 6000));
        } catch (e) {
            console.log("⚠️ Falha ao clicar na aba Live diretamente.");
        }

        // 1. Coleta os links e dados básicos da listagem ao vivo
        const linksPartidas = await page.evaluate(() => {
            const lista = [];
            const linhas = document.querySelectorAll('tr, div, li');

            linhas.forEach(b => {
                const txt = b.innerText ? b.innerText.trim() : '';
                if (!txt || txt.length < 15 || txt.length > 300) return;
                if (/Copyright|Soccerway|Sign up|Full-time|Finished|\bFT\b|ALL|SCHEDULED/i.test(txt)) return;

                const colunas = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                let indexMinuto = colunas.findIndex(l => /^\d{1,2}'?$/.test(l) || /^\d+\+\d+'?$/.test(l));
                if (indexMinuto === -1) return;

                let tempo = colunas[indexMinuto].replace("'", "") + "'";
                let limpos = colunas.filter(l => l !== colunas[indexMinuto] && !/^\d+$/.test(l) && !/^\d{2}:\d{2}$/.test(l) && l.length > 2);
                let numeros = colunas.filter(l => /^\d+$/.test(l) && l !== colunas[indexMinuto]);

                // Tenta capturar o link da partida se houver tag <a> no bloco
                const linkEl = b.querySelector('a[href*="/matches/"]');
                let href = linkEl ? linkEl.href : null;

                if (limpos.length >= 2 && numeros.length >= 2) {
                    lista.push({
                        tempo,
                        timeA: limpos[0],
                        timeB: limpos[1],
                        placar: `${numeros[0]} x ${numeros[1]}`,
                        link: href
                    });
                }
            });

            // Remove duplicatas
            const unicas = [];
            const vistas = new Set();
            lista.forEach(item => {
                const chave = `${item.timeA}x${item.timeB}`;
                if (!vistas.has(chave)) {
                    vistas.add(chave);
                    unicas.push(item);
                }
            });

            return unicas;
        });

        console.log(`⚽ [Bot Pro] Partidas localizadas: ${linksPartidas.length}. Varrendo estatísticas...`);

        if (linksPartidas.length > 0) {
            let enviados = 0;
            
            // Limitamos a varredura interna a 10 jogos por ciclo para garantir velocidade e estabilidade na Render
            for (let i = 0; i < Math.min(linksPartidas.length, 10); i++) {
                let p = linksPartidas[i];
                let estatisticas = { cantos: "N/D", cartoes: "N/D", posses: "N/D" };

                // Se encontrou link interno, entra na página da partida para pegar escanteios e cartões
                if (p.link) {
                    try {
                        const pageJogo = await browser.newPage();
                        await pageJogo.goto(p.link, { waitUntil: 'domcontentloaded', timeout: 20000 });
                        await new Promise(r => setTimeout(r, 2000));

                        estatisticas = await pageJogo.evaluate(() => {
                            let cantos = "0 - 0";
                            let cartoesAmarelos = "0 - 0";
                            
                            // Varre tabelas de estatísticas comuns no Soccerway
                            const rows = document.querySelectorAll('tr, div');
                            rows.forEach(r => {
                                const texto = r.innerText || "";
                                if (/Corners|Escanteios/i.test(texto)) {
                                    const nums = texto.match(/\d+/g);
                                    if (nums && nums.length >= 2) cantos = `${nums[0]} - ${nums[1]}`;
                                }
                                if (/Yellow cards|Cartões amarelos/i.test(texto)) {
                                    const nums = texto.match(/\d+/g);
                                    if (nums && nums.length >= 2) cartoesAmarelos = `${nums[0]} - ${nums[1]}`;
                                }
                            });

                            return {
                                cantos: cantos,
                                cartoes: cartoesAmarelos
                            };
                        });

                        await pageJogo.close();
                    } catch (err) {
                        // Ignora erro individual de página e mantém padrão
                    }
                }

                enviados++;

                // Card Futurístico e Completo com Dados Avançados
                let card = `🛸 <code>[ SYSTEM // LIVE_PRO_RADAR ]</code> ⚡\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `⏱  <b>TEMPO</b>  ➔  <code>[ ${p.tempo} ]</code>\n`;
                card += `⚽  <b>CONFRONTO</b>\n`;
                card += `    🔹 <b>${p.timeA}</b>\n`;
                card += `    🔸 <b>${p.timeB}</b>\n`;
                card += `📊  <b>PLACAR</b>  ➔  ⚡ <code> ${p.placar} </code> ⚡\n`;
                card += `──────────────────────\n`;
                card += `📐 <b>Escanteios:</b> <code>${estatisticas.cantos}</code>\n`;
                card += `🟨 <b>Cartões Amarelos:</b> <code>${estatisticas.cartoes}</code>\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `🤖 <i>Neural Data: Sync Complete</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(()=>{});
                await new Promise(r => setTimeout(r, 1000)); 
            }
            console.log(`✅ ${enviados} cards avançados enviados ao Telegram com sucesso!`);
        } else {
            bot.sendMessage(CHAT_ID, "⚠️ *Nenhum jogo ao vivo encontrado no momento.*", { parse_mode: 'Markdown' }).catch(()=>{});
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
