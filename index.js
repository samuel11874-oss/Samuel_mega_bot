const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar TotalCorner Rodando! ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

let historicoPlacares = {};

async function executarRadarTotalCorner() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot TC] Varrendo tabelas do TotalCorner...");
        
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--single-process',
                '--window-size=1366,768'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1366, height: 768 });

        console.log("🌐 Acessando TotalCorner...");
        await page.goto('https://www.totalcorner.com/match/live', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log("⏳ Aguardando 7 segundos para carregamento total das tabelas...");
        await new Promise(r => setTimeout(r, 7000));

        // Extrai dados diretamente das tabelas confirmadas no diagnóstico (#home_page_corner e #featured_match_table)
        const partidas = await page.evaluate(() => {
            const resultados = [];
            const selector = '#home_page_corner tbody tr, #featured_match_table tbody tr, table.match_table tbody tr';
            const linhas = document.querySelectorAll(selector);

            linhas.forEach(tr => {
                if (tr.querySelector('th') || tr.cells.length < 4) return;

                const colunas = Array.from(tr.querySelectorAll('td')).map(td => td.innerText ? td.innerText.trim() : '');
                
                // Filtra apenas linhas que contêm informações de jogos
                if (colunas.length >= 4) {
                    const textoLinha = colunas.join(' | ');
                    
                    // Procura indicar tempo/minuto ou ao vivo
                    if (/\d+['"]|HT|Live|Min/i.test(textoLinha) || colunas.some(c => /^\d+$/.test(c))) {
                        resultados.push({
                            dadosBrutos: colunas,
                            resumo: textoLinha.replace(/\n/g, ' ')
                        });
                    }
                }
            });

            return resultados;
        });

        console.log(`⚽ [Bot TC] Partidas encontradas nas tabelas: ${partidas.length}`);

        if (partidas.length > 0) {
            let enviados = 0;
            let novoHistorico = {};

            // Envia amostra das partidas ativas para o Telegram
            for (let i = 0; i < Math.min(partidas.length, 20); i++) {
                let p = partidas[i];
                enviados++;

                let textoCard = p.resumo.length > 250 ? p.resumo.substring(0, 250) + "..." : p.resumo;

                let card = `🛸 <code>[ RADAR TOTALCORNER // AO VIVO ]</code> ⚡\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `📌 <b>DADOS DA PARTIDA:</b>\n`;
                card += `<code>${textoCard}</code>\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `🤖 <i>Monitoramento em tempo real</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(()=>{});
                await new Promise(r => setTimeout(r, 600)); 
            }

            console.log(`✅ ${enviados} alertas enviados com sucesso para o Telegram!`);
        } else {
            console.log("⚠️ Nenhuma partida ao vivo detectada no momento da varredura.");
        }

    } catch (error) {
        console.error("❌ Erro na varredura:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

// Executa a cada 5 minutos (300.000 ms)
setInterval(executarRadarTotalCorner, 300000);
executarRadarTotalCorner();
