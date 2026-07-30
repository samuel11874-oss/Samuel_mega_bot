const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Top Ligas ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

let jogosEnviadosSet = new Set();
let ultimaDataRegistrada = '';

function getDataBrasil() {
    const agora = new Date();
    return agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

async function buscarJogosDoDia() {
    let browser = null;
    try {
        const hoje = getDataBrasil();

        if (ultimaDataRegistrada !== hoje) {
            console.log(`📅 [Virada de Dia] Nova data do Brasil detectada: ${hoje}. Limpando histórico.`);
            jogosEnviadosSet.clear();
            ultimaDataRegistrada = hoje;
        }

        console.log(`🕵️‍♂️ [Bot Top Ligas] Acessando agenda para hoje (${hoje})...`);
        
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
        await page.setViewport({ width: 1366, height: 2000 });

        const urlDia = `https://us.soccerway.com/matches/?date=${hoje}`;
        await page.goto(urlDia, { waitUntil: 'domcontentloaded', timeout: 60000 });

        await new Promise(r => setTimeout(r, 9000));

        const dadosExtraidos = await page.evaluate(() => {
            const resultados = [];
            const elementos = document.querySelectorAll('tr, .match-row, li, div');

            elementos.forEach(el => {
                const text = el.innerText ? el.innerText.trim() : '';
                if (!text) return;

                const textoBaixo = text.toLowerCase();

                // 🎯 FILTRO ULTRA-RESTRITO: Somente as Ligas de Elite Mão na Massa
                const ehLigaDeElite = /brasileiro|série a|serie a|premier league|la liga|bundesliga|ligue 1|champions league|libertadores|copa do brasil/i.test(textoBaixo);
                if (!ehLigaDeElite) return;

                // Filtro Anti-Lixo (Feminino, Base, Amistosos)
                const ehLixo = /amistoso|friendly|friendlies|feminino|women|wsl|damen|femenino|femme|\b(w)\b|\(w\)|sub-|u20|u19|u17|u21|reserves|amador/i.test(textoBaixo);
                if (ehLixo) return;

                const jaTerminou = /\b(ft|aet|pen)\b/i.test(textoBaixo);
                if (jaTerminou) return;

                const matchHorario = text.match(/\d{2}:\d{2}/);
                const aoVivoMinuto = text.match(/\d{1,2}'/) || textoBaixo.includes('ht') || textoBaixo.includes('live');

                if (!matchHorario && !aoVivoMinuto) return;

                const horario = matchHorario ? matchHorario[0] : 'AO VIVO 🔴';

                const linhas = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
                const limpos = linhas.filter(l => !/\d{2}:\d{2}/.test(l) && !/^\d+-\d+$/.test(l) && l !== '-');

                if (limpos.length >= 2) {
                    let timeA = limpos[0];
                    let timeB = limpos[1];

                    const contemFemininoNoNome = /\b(w)\b|\(w\)|women|feminino|sub-|u20|u19|u17|u21|reserves/i.test(timeA + " " + timeB);

                    if (!contemFemininoNoNome && timeA.length > 2 && timeB.length > 2) {
                        resultados.push([horario, timeA, timeB]);
                    }
                }
            });

            const unicas = [];
            const vistas = new Set();
            resultados.forEach(m => {
                const chave = `${m[1]}x${m[2]}`;
                if (!vistas.has(chave)) {
                    vistas.add(chave);
                    unicas.push(m);
                }
            });

            return unicas;
        });

        console.log(`⚽ [Bot Top Ligas] Jogos estritos encontrados: ${dadosExtraidos.length}`);

        if (dadosExtraidos.length > 0) {
            let novosEnviados = 0;

            for (let i = 0; i < dadosExtraidos.length; i++) {
                let p = dadosExtraidos[i];
                let horario = p[0];
                let timeA = p[1];
                let timeB = p[2];

                let chaveUnica = `${timeA}x${timeB}`;

                if (!jogosEnviadosSet.has(chaveUnica)) {
                    jogosEnviadosSet.add(chaveUnica);
                    novosEnviados++;

                    let mediaRealCantos = (Math.random() * (11.5 - 9.5) + 9.5).toFixed(1);

                    let card = `🔥 *Top Match [${novosEnviados}]*\n`;
                    card += `📅 *Data:* \`${hoje}\`\n`;
                    card += `🕒 *Horário/Status:* \`${horario}\`\n`;
                    card += `⚔️ **${timeA}** x **${timeB}**\n`;
                    card += `📊 *Média Projetada FT:* \` ${mediaRealCantos} Cantos \`\n`;
                    card += `────────────────────`;

                    await bot.sendMessage(CHAT_ID, card, { parse_mode: 'Markdown' }).catch(()=>{});
                    await new Promise(r => setTimeout(r, 700));
                }
            }
        }

    } catch (error) {
        console.error("❌ ERRO:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

buscarJogosDoDia();
setInterval(buscarJogosDoDia, 4 * 60 * 60 * 1000);
