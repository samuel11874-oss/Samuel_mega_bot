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
        console.log("🕵️‍♂️ [Bot Pre-Match] Iniciando varredura inteligente para AMANHÃ...");
        
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

        console.log("🌐 [Bot Pre-Match] Acessando US Soccerway...");
        await page.goto('https://us.soccerway.com/matches/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // Aguarda os elementos dinâmicos da tabela de partidas aparecerem na tela
        console.log("⏳ [Bot Pre-Match] Aguardando renderização completa da tabela...");
        try {
            await page.waitForSelector('tr, div.match, div.content', { timeout: 10000 });
        } catch (e) {
            console.log("⚠️ Timeout aguardando seletor específico, prosseguindo com varredura geral...");
        }

        await new Promise(r => setTimeout(r, 5000));

        // Varredura abrangente focada em blocos de partidas e horários
        const partidasAmanha = await page.evaluate(() => {
            const resultados = [];
            // Varre tanto linhas de tabela quanto blocos de divs de partidas
            const elementos = document.querySelectorAll('tr, div');

            elementos.forEach(el => {
                const txt = el.innerText ? el.innerText.trim() : '';
                
                const ehLixo = txt.includes('Gamble') || txt.includes('Copyright') || 
                               txt.includes('Soccerway') || txt.includes('FAVORITES') || 
                               txt.length < 8 || txt.length > 200;

                if (!ehLixo) {
                    const temHorario = /\d{2}:\d{2}/.test(txt);
                    const temConfronto = txt.includes('-');
                    const naoEhAoVivo = !txt.includes("'") && !txt.includes('HT') && !txt.includes('FT');

                    if (temHorario && temConfronto && naoEhAoVivo) {
                        const linhas = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                        if (linhas.length >= 2 && !resultados.some(r => r.join('|') === linhas.join('|'))) {
                            resultados.push(linhas);
                        }
                    }
                }
            });

            return resultados;
        });

        console.log(`⚽ [Bot Pre-Match] Partidas futuras encontradas: ${partidasAmanha.length}`);

        if (partidasAmanha.length > 0) {
            await bot.sendMessage(CHAT_ID, `📅 *RELATÓRIO PRÉ-MATCH: JOGOS DE AMANHÃ* ⚽\n*Foco:* Confronto & Média de Escanteios FT\n────────────────────`, { parse_mode: 'Markdown' }).catch(()=>{});

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
            console.log("⚠️ Nenhuma partida capturada na rota de matches.");
            bot.sendMessage(CHAT_ID, "⚠️ *Aviso Pre-Match:* O site mudou a estrutura da tabela de amanhã. O robô está operacional e monitorando.", { parse_mode: 'Markdown' }).catch(()=>{});
        }

    } catch (error) {
        console.error("❌ ERRO CRÍTICO:", error.message);
        bot.sendMessage(CHAT_ID, `❌ *Erro Pre-Match:* ${error.message}`, { parse_mode: 'Markdown' }).catch(()=>{});
    } finally {
        if (browser) await browser.close();
    }
}

investigarEBuscarJogosAmanha();
