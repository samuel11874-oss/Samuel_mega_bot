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
        console.log("🕵️‍♂️ [Bot US] Iniciando varredura oficial via Classes CSS...");
        
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

        console.log("🌐 [Bot US] Acessando us.soccerway.com...");
        await page.goto('https://us.soccerway.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        await new Promise(r => setTimeout(r, 4000));
        
        // Clica na aba LIVE de forma segura
        try {
            console.log("🔍 Clicando na aba 'LIVE'...");
            await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a, span'));
                const abaLive = links.find(el => el.innerText && el.innerText.trim() === 'LIVE');
                if (abaLive) abaLive.click();
            });
            await new Promise(r => setTimeout(r, 6000)); // Aguarda os jogos carregarem na tela
        } catch (e) {
            console.log("⚠️ Falha ao clicar na aba Live. Continuando...");
        }

        // 🧠 EXTRATOR PROFISSIONAL (Usa as classes HTML oficiais do Soccerway)
        const partidas = await page.evaluate(() => {
            const resultados = [];
            // O Soccerway guarda os jogos em linhas <tr> com a classe 'match'
            const linhasDeJogos = document.querySelectorAll('tr.match');

            linhasDeJogos.forEach(row => {
                // Captura exatamente cada bloco pelas classes oficiais
                const minutoEl = row.querySelector('.minute');
                const timeAEl = row.querySelector('.team-a');
                const placarEl = row.querySelector('.score-time');
                const timeBEl = row.querySelector('.team-b');
                
                if (timeAEl && timeBEl && placarEl) {
                    const timeA = timeAEl.innerText.trim();
                    const timeB = timeBEl.innerText.trim();
                    const placar = placarEl.innerText.trim();
                    
                    let tempo = minutoEl ? minutoEl.innerText.trim() : 'Ao Vivo';

                    // Filtros de Segurança
                    const isJogoEncerrado = /FT|Full-time|Finished/i.test(tempo) || /FT|Full-time/i.test(placar);
                    const isJogoAgendado = placar.includes(':'); // Jogos não iniciados mostram o horário, ex: "15:30"
                    
                    // Só aprova se NÃO estiver encerrado e NÃO for agendado (tem que ter o '-' de placar, ex: "1 - 0")
                    if (!isJogoEncerrado && !isJogoAgendado && placar.includes('-')) {
                        
                        // Garante que o minuto tenha o símbolo (') visualmente, se for apenas número
                        if (/^\d+$/.test(tempo) || /^\d+\+\d+$/.test(tempo)) {
                            tempo += "'";
                        }

                        resultados.push({
                            tempo: tempo,
                            timeA: timeA,
                            timeB: timeB,
                            placar: placar
                        });
                    }
                }
            });

            // Remove duplicatas caso o Soccerway mostre a mesma partida em duas ligas
            const unicas = [];
            const vistas = new Set();
            resultados.forEach(item => {
                const chave = `${item.timeA}x${item.timeB}`;
                if (!vistas.has(chave)) {
                    vistas.add(chave);
                    unicas.push(item);
                }
            });

            return unicas;
        });

        console.log(`⚽ [Bot US] Partidas AO VIVO capturadas limpas: ${partidas.length}`);

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
                await new Promise(r => setTimeout(r, 600)); // Delay para evitar bloqueio do Telegram
            }
            console.log(`✅ ${enviados} partidas enviadas para o Telegram com sucesso!`);
        } else {
            bot.sendMessage(CHAT_ID, "⚠️ *Nenhum jogo ao vivo rolando neste exato momento.*", { parse_mode: 'Markdown' }).catch(()=>{});
        }

    } catch (error) {
        console.error("❌ Erro no Puppeteer:", error.message);
        bot.sendMessage(CHAT_ID, `❌ *Erro no Bot:* ${error.message}`, { parse_mode: 'Markdown' }).catch(()=>{});
    } finally {
        if (browser) await browser.close();
    }
}

// Roda a cada 10 minutos (600.000 ms)
setInterval(buscarJogosAoVivo, 600000);
buscarJogosAoVivo();
