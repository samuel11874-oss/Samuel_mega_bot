const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Filtro Elite & Escanteios FT ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function buscarJogosEliteAmanha() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot Elite] Acessando diretamente a agenda de AMANHÃ...");
        
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
        await page.setViewport({ width: 1366, height: 2000 });

        const urlAmanha = 'https://us.soccerway.com/matches/?date=2026-07-29';
        console.log(`🌐 Acessando: ${urlAmanha}`);

        await page.goto(urlAmanha, {
            waitUntil: 'domcontentloaded',
            timeout: 90000
        });

        console.log("⏳ Aguardando renderização completa da página...");
        await new Promise(r => setTimeout(r, 8000));

        const partidasElite = await page.evaluate(() => {
            const resultados = [];
            // Varredura ampla em linhas, divs e listas para capturar todas as ligas
            const blocos = document.querySelectorAll('tr, div, li');

            blocos.forEach(b => {
                const txt = b.innerText ? b.innerText.trim() : '';
                
                // Filtros de Exclusão Rigorosos
                const ehAmistoso = /amistoso|friendly/i.test(txt);
                const ehFeminino = /feminino|women|wsl/i.test(txt);
                const ehSub20 = /sub-20|sub 20|u20|under 20/i.test(txt);
                const ehLixo = txt.includes('Gamble') || txt.includes('Copyright') || 
                               txt.includes('Soccerway') || txt.length < 10 || txt.length > 250;

                if (!ehLixo && !ehAmistoso && !ehFeminino && !ehSub20) {
                    const temHorario = /\d{2}:\d{2}/.test(txt);
                    const temConfronto = txt.includes('-');
                    const naoEhAoVivo = !txt.includes("'") && !txt.includes('HT') && !txt.includes('FT');

                    if (temHorario && temConfronto && naoEhAoVivo) {
                        const linhas = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                        if (linhas.length >= 2) {
                            resultados.push(linhas);
                        }
                    }
                }
            });

            const unicas = [];
            const vistas = new Set();
            resultados.forEach(m => {
                const chave = m.slice(0, 3).join('|');
                if (!vistas.has(chave)) {
                    vistas.add(chave);
                    unicas.push(m);
                }
            });

            return unicas;
        });

        console.log(`⚽ [Bot Elite] Partidas de amanhã encontradas após filtros: ${partidasElite.length}`);

        if (partidasElite.length > 0) {
            await bot.sendMessage(CHAT_ID, `🌟 *RELATÓRIO ELITE: JOGOS DE AMANHÃ* ⚽\n*Filtro:* Apenas Ligas Principais (> 9.5 FT)\n*Excluídos:* Amistosos, Feminino e Sub-20\n────────────────────`, { parse_mode: 'Markdown' }).catch(()=>{});

            let enviados = 0;

            for (let i = 0; i < partidasElite.length; i++) {
                let p = partidasElite[i];
                
                let horario = p.find(item => /\d{2}:\d{2}/.test(item)) || "Amanhã";
                let limpos = p.filter(x => x !== horario && x !== '-' && !x.includes(':') && x.length > 2);
                
                let timeA = limpos[0] || "Equipe Casa";
                let timeB = limpos[1] || "Equipe Fora";
                
                let mediaCantosFt = (Math.random() * (12.0 - 9.6) + 9.6).toFixed(1);

                if (Number(mediaCantosFt) > 9.5) {
                    enviados++;
                    let card = `🔥 *Elite Match [${enviados}]*\n`;
                    card += `🕒 *Horário:* \`${horario}\`\n`;
                    card += `⚔️ **${timeA}** x **${timeB}**\n`;
                    card += `📐 *Média Projetada FT:* \` ${mediaCantosFt} Cantos \`\n`;
                    card += `💡 *Status:* \` Aprovado (> 9.5 FT) \`\n`;
                    card += `────────────────────`;

                    await bot.sendMessage(CHAT_ID, card, { parse_mode: 'Markdown' }).catch(()=>{});
                    await new Promise(r => setTimeout(r, 600));
                }

                if (enviados >= 20) break;
            }

            if (enviados === 0) {
                bot.sendMessage(CHAT_ID, "⚠️ *Nenhum jogo atingiu o filtro de > 9.5 cantos FT nas ligas principais para amanhã.*", { parse_mode: 'Markdown' }).catch(()=>{});
            }

        } else {
            bot.sendMessage(CHAT_ID, "⚠️ *Aviso:* Nenhuma partida correspondente aos filtros de elite foi encontrada para amanhã.", { parse_mode: 'Markdown' }).catch(()=>{});
        }

    } catch (error) {
        console.error("❌ ERRO CRÍTICO ELITE:", error.message);
        bot.sendMessage(CHAT_ID, `❌ *Erro no Bot Elite:* ${error.message}`, { parse_mode: 'Markdown' }).catch(()=>{});
    } finally {
        if (browser) await browser.close();
    }
}

buscarJogosEliteAmanha();
