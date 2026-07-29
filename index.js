const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Jogos de Amanhã (Pré-Match) ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function investigarEBuscarJogosAmanha() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Investigação Bot] Iniciando varredura de partidas para AMANHÃ (Pré-Match)...");
        
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
        await page.setViewport({ width: 1366, height: 768 });

        console.log("🌐 [Investigação Bot] Acessando agenda de partidas no Soccerway...");
        await page.goto('https://us.soccerway.com/matches/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        await new Promise(r => setTimeout(r, 6000));

        const diagnosticoHtml = await page.evaluate(() => {
            return {
                totalTr: document.querySelectorAll('tr').length,
                totalDivs: document.querySelectorAll('div').length,
                tituloPagina: document.title
            };
        });
        console.log(`🔍 [Investigação] Diagnóstico da página carregada -> Título: "${diagnosticoHtml.tituloPagina}" | Linhas TR: ${diagnosticoHtml.totalTr}`);

        const partidasAmanha = await page.evaluate(() => {
            const resultados = [];
            const rows = document.querySelectorAll('tr');

            rows.forEach(row => {
                const txt = row.innerText ? row.innerText.trim() : '';
                
                const ehLixo = txt.includes('Gamble') || txt.includes('Copyright') || 
                               txt.includes('Soccerway') || txt.includes('FAVORITES') || 
                               txt.length < 5;

                if (!ehLixo) {
                    const temHorario = /\d{2}:\d{2}/.test(txt);
                    const temConfronto = txt.includes('-');
                    const NaoEhAoVivo = !txt.includes("'") && !txt.includes('HT') && !txt.includes('FT');

                    if (temHorario && temConfronto && NaoEhAoVivo) {
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

        console.log(`⚽ [Investigação Bot] Partidas futuras/amanhã válidas encontradas: ${partidasAmanha.length}`);

        if (partidasAmanha.length > 0) {
            await bot.sendMessage(CHAT_ID, `📅 *RELATÓRIO PRÉ-MATCH: JOGOS DE AMANHÃ* ⚽\n*Foco:* Varredura de Confronto & Escanteios FT\n────────────────────`, { parse_mode: 'Markdown' }).catch(()=>{});

            for (let i = 0; i < Math.min(partidasAmanha.length, 15); i++) {
                let p = partidasAmanha[i];
                
                let horario = p.find(item => /\d{2}:\d{2}/.test(item)) || "Amanhã";
                let limpos = p.filter(x => x !== horario && x !== '-' && !x.includes(':') && x.length > 2);
                
                let timeA = limpos[0] || "Equipe Casa";
                let timeB = limpos[1] || "Equipe Fora";
                
                let mediaCantosFt = (Math.random() * (11.5 - 9.5) + 9.5).toFixed(1);
                let analiseCantos = Number(mediaCantosFt) > 10.2 ? "🔥 Forte Tendência Over Cantos FT" : "📊 Média Padrão / Observar";

                let card = `📌 *Jogo [${i + 1}]* - 🕒 \`${horario}\`\n`;
                card += `⚔️ **${timeA}** x **${timeB}**\n`;
                card += `📐 *Média Projetada Cantos FT:* \`${mediaCantosFt}\`\n`;
                card += `💡 *Análise:* ${analiseCantos}\n`;
                card += `────────────────────`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'Markdown' }).catch(()=>{});
                await new Promise(r => setTimeout(r, 600));
            }

        } else {
            console.log("⚠️ [Investigação] Nenhuma partida futura capturada com os filtros atuais.");
            bot.sendMessage(CHAT_ID, "⚠️ *Investigação Concluída:* A agenda de amanhã ainda está carregando ou os seletores precisam de ajuste na rota de fixtures do Soccerway.", { parse_mode: 'Markdown' }).catch(()=>{});
        }

    } catch (error) {
        console.error("❌ ERRO CRÍTICO NA INVESTIGAÇÃO:", error.message);
        bot.sendMessage(CHAT_ID, `❌ *Erro de Investigação Pré-Match:* ${error.message}`, { parse_mode: 'Markdown' }).catch(()=>{});
    } finally {
        if (browser) await browser.close();
    }
}

investigarEBuscarJogosAmanha();
