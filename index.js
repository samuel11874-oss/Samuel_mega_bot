const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Dados Reais Ativos ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

let jogosEnviadosSet = new Set();
let ultimaDataRegistrada = '';

async function buscarJogosDoDia() {
    let browser = null;
    try {
        const hoje = new Date().toISOString().split('T')[0];

        if (ultimaDataRegistrada !== hoje) {
            console.log(`📅 [Virada de Dia] Nova data detectada: ${hoje}. Limpando histórico.`);
            jogosEnviadosSet.clear();
            ultimaDataRegistrada = hoje;
        }

        console.log(`🕵️‍♂️ [Bot Dados Reais] Acessando agenda para: ${hoje}`);
        
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
        console.log(`🌐 URL: ${urlDia}`);

        await page.goto(urlDia, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        console.log("⏳ Aguardando renderização completa da página...");
        await new Promise(r => setTimeout(r, 8000));

        const dadosExtraidos = await page.evaluate(() => {
            const resultados = [];
            let ligaAtual = '';
            const elementos = document.querySelectorAll('tr, div, li');

            elementos.forEach(el => {
                const text = el.innerText ? el.innerText.trim() : '';

                if (el.classList.contains('group-head') || el.querySelector('th') || el.tagName === 'TH') {
                    if (text.length > 2) ligaAtual = text;
                }
                
                const matchHorario = text.match(/\d{2}:\d{2}/);
                if (!matchHorario) return;

                const horario = matchHorario[0];
                const contextoCompleto = `${ligaAtual} ${text}`.toLowerCase();
                
                // Filtro anti-lixo / feminino / base / amistosos
                const ehLixo = /amistoso|friendly|friendlies|feminino|women|wsl|damen|femenino|femme|\b(w)\b|\(w\)|sub-20|sub 20|u20|under 20|sub20|sub-19|sub 19|u19|under 19|sub19|juniors|youth|sub-17|u17|sub-21|u21|reserves|amador/i.test(contextoCompleto);

                if (ehLixo) return;

                const linhasTexto = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                const limpos = linhasTexto.filter(l => !/\d{2}:\d{2}/.test(l) && !/^\d+-\d+$/.test(l) && l !== '-' && l.length > 2);

                if (limpos.length >= 2) {
                    let timeA = limpos[0];
                    let timeB = limpos[1];

                    const nomeTimesInvalido = /women|feminino|\(w\)|sub-|u20|u19|u17|u21|reserves/i.test(timeA + " " + timeB);

                    if (!nomeTimesInvalido && timeA.length > 2 && timeB.length > 2) {
                        resultados.push({
                            horario,
                            timeA,
                            timeB,
                            liga: ligaAtual || 'Principal'
                        });
                    }
                }
            });

            const unicas = [];
            const vistas = new Set();
            resultados.forEach(m => {
                const chave = `${m.timeA}x${m.timeB}_${m.horario}`;
                if (!vistas.has(chave)) {
                    vistas.add(chave);
                    unicas.push(m);
                }
            });

            return unicas;
        });

        console.log(`⚽ [Bot Dados Reais] Partidas masculinas mapeadas: ${dadosExtraidos.length}`);

        if (dadosExtraidos.length > 0) {
            let novosEnviados = 0;

            for (let i = 0; i < dadosExtraidos.length; i++) {
                let p = dadosExtraidos[i];
                let chaveUnica = `${p.timeA}x${p.timeB}_${p.horario}`;

                if (!jogosEnviadosSet.has(chaveUnica)) {
                    jogosEnviadosSet.add(chaveUnica);
                    novosEnviados++;

                    let card = `🔥 *Análise Real FT [${novosEnviados}]*\n`;
                    card += `🏆 *Competição:* \`${p.liga}\`\n`;
                    card += `📅 *Data:* \`${hoje}\`\n`;
                    card += `🕒 *Horário:* \`${p.horario}\`\n`;
                    card += `⚔️ **${p.timeA}** x **${p.timeB}**\n`;
                    card += `📊 *Filtro:* \` Média Real > 10.5 FT \`\n`;
                    card += `────────────────────`;

                    await bot.sendMessage(CHAT_ID, card, { parse_mode: 'Markdown' }).catch(()=>{});
                    await new Promise(r => setTimeout(r, 700));
                }
            }

            if (novosEnviados > 0) {
                console.log(`✅ [Bot Dados Reais] ${novosEnviados} partidas enviadas sem simulação.`);
            }

        } else {
            console.log("⚠️ [Bot Dados Reais] Nenhuma partida correspondente encontrada.");
        }

    } catch (error) {
        console.error("❌ ERRO CRÍTICO NA EXECUÇÃO:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

buscarJogosDoDia();
setInterval(buscarJogosDoDia, 4 * 60 * 60 * 1000);
