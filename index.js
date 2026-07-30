const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Monitor Ao Vivo ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function buscarJogosAoVivo() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot US] Restaurando configuração base e buscando AO VIVO...");
        
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

        console.log("🌐 [Bot US] Acessando us.soccerway.com (Página Principal)...");
        await page.goto('https://us.soccerway.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 45000
        });

        await new Promise(r => setTimeout(r, 4000));
        
        try {
            console.log("🔍 [Bot US] Clicando dinamicamente na aba 'LIVE'...");
            await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a, span, div, li'));
                const abaLive = links.find(el => el.innerText && el.innerText.trim() === 'LIVE');
                if (abaLive) abaLive.click();
            });
            await new Promise(r => setTimeout(r, 5000));
        } catch (e) {
            console.log("⚠️ Falha ao clicar, prosseguindo com varredura...");
        }

        // Extrai os blocos exatamente como fizemos quando retornou 34 jogos
        const partidasRaw = await page.evaluate(() => {
            const resultados = [];
            const blocos = document.querySelectorAll('tr, div, li');

            blocos.forEach(b => {
                const txt = b.innerText ? b.innerText.trim() : '';
                if (!txt || txt.length < 10 || txt.length > 300) return;

                // 🚫 Ignora lixo e JOGOS ENCERRADOS!
                const ehLixo = /FAVORITES|PREMIER LEAGUE|Copyright|Soccerway|Sign up|privacy|cookie|FT|Full-time|Finished/i.test(txt);
                
                if (!ehLixo) {
                    const formatado = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    if (formatado.length >= 3) {
                        resultados.push(formatado);
                    }
                }
            });
            return resultados;
        });

        // 🧠 Filtro Inteligente no Node: Organiza times, tempos e placares
        const unicas = new Map();

        partidasRaw.forEach(p => {
            // 1. Acha o Tempo: Procura o primeiro número, ou HT (Half Time)
            let indexMinuto = p.findIndex(item => /^\d+[']?$/.test(item) || /^\d+\+\d+[']?$/.test(item) || item === 'HT' || /Half/.test(item));
            if (indexMinuto === -1) return; // Se não tem tempo, não está ao vivo

            let tempo = p[indexMinuto];
            if (!tempo.includes("'") && tempo !== 'HT' && !/Half/.test(tempo)) tempo = tempo + "'";

            // 2. Acha os Times (Textos que não são números isolados e não têm ':')
            let times = p.filter((x, idx) => idx !== indexMinuto && !/^\d+$/.test(x) && !/^\d+\s*-\s*\d+$/.test(x) && !x.includes(':') && x.length > 2);
            if (times.length < 2) return;
            
            let timeA = times[0];
            let timeB = times[1];

            // 3. Acha o Placar (Procura formato "2 - 1" ou números isolados das linhas)
            let placarMatch = p.find(item => /^\d+\s*-\s*\d+$/.test(item));
            let golA, golB;

            if (placarMatch) {
                let partes = placarMatch.split('-');
                golA = partes[0].trim();
                golB = partes[1].trim();
            } else {
                let numeros = p.filter((x, idx) => idx !== indexMinuto && /^\d+$/.test(x));
                if (numeros.length >= 2) {
                    golA = numeros[0];
                    golB = numeros[1];
                } else {
                    return; // Sem placar
                }
            }

            // Salva apenas partidas únicas
            const chave = `${timeA} x ${timeB}`;
            if (!unicas.has(chave)) {
                unicas.set(chave, { tempo, timeA, timeB, placar: `${golA} x ${golB}` });
            }
        });

        const partidas = Array.from(unicas.values());
        console.log(`⚽ [Bot US] Partidas AO VIVO capturadas: ${partidas.length}`);

        if (partidas.length > 0) {
            let enviados = 0;
            for (let i = 0; i < Math.min(partidas.length, 25); i++) {
                let p = partidas[i];
                enviados++;

                let card = `⚡ *Partida Ao Vivo [${enviados}]*\n`;
                card += `────────────────────\n`;
                card += `⏱ *Tempo:* \`${p.tempo}\`\n`;
                card += `⚽ **${p.timeA}** x **${p.timeB}**\n`;
                card += `📊 *Placar:* \` ${p.placar} \`\n`;
                card += `📐 *Cantos / Cartões:* \`Aguardando dados oficiais\`\n`;
                card += `────────────────────`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'Markdown' }).catch(()=>{});
                await new Promise(r => setTimeout(r, 500));
            }
            console.log(`✅ ${enviados} jogos enviados ao Telegram!`);
        } else {
            console.log("⚠️ Nenhuma partida rolando no momento da varredura.");
            bot.sendMessage(CHAT_ID, "⚠️ *Nenhum jogo ao vivo encontrado no momento da varredura.*", { parse_mode: 'Markdown' }).catch(()=>{});
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
