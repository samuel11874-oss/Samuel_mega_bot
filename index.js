const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar Prioridade Ao Vivo ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarAoVivoGeral() {
    let browser = null;
    try {
        console.log("⚡ [Radar Ao Vivo] Coletando partidas com foco em andamento real...");

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
        
        console.log("🌐 Acessando https://www.totalcorner.com/pt/match/live ...");
        await page.goto('https://www.totalcorner.com/pt/match/live', {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        console.log("⏳ Aguardando carregamento e rolando a página...");
        await new Promise(r => setTimeout(r, 6000));

        // Rolagem para garantir carregamento completo
        for (let i = 0; i < 4; i++) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await new Promise(r => setTimeout(r, 2000));
        }

        // Extração de todos os jogos únicos da tabela
        const dadosPartidas = await page.evaluate(() => {
            const aoVivoSet = new Set();
            const outrosSet = new Set();
            const trs = document.querySelectorAll('tr');

            trs.forEach((tr, index) => {
                const texto = tr.innerText.replace(/\s+/g, ' ').trim();
                
                if (index > 0 && (texto.includes('vs') || texto.includes(' - ')) && texto.length > 10) {
                    // Identifica se tem marcação de tempo/minuto ao vivo (ex: 15', 45', HT, 90', 2ºT)
                    const temTempoAoVivo = /\d+'|HT|1ºT|2ºT|Intervalo/i.test(texto);

                    if (temTempoAoVivo) {
                        aoVivoSet.add(texto);
                    } else {
                        outrosSet.add(texto);
                    }
                }
            });

            return {
                aoVivo: Array.from(aoVivoSet),
                outros: Array.from(outrosSet)
            };
        });

        console.log(`🔴 Jogos Ao Vivo com tempo real: ${dadosPartidas.aoVivo.length}`);
        console.log(`📅 Outros jogos listados: ${dadosPartidas.outros.length}`);

        // Monta a mensagem consolidada
        let mensagem = `⚽ <b>[RADAR TOTALCORNER - ATUALIZADO]</b> ⚽\n\n`;

        if (dadosPartidas.aoVivo.length > 0) {
            mensagem += `🔴 <b>JOGOS AO VIVO ROLANDO (${dadosPartidas.aoVivo.length}):</b>\n\n`;
            let c = 1;
            for (const jogo of dadosPartidas.aoVivo) {
                mensagem += `<b>#${c}</b> 🟢 <code>${jogo}</code>\n\n`;
                c++;
            }
        } else {
            mensagem += `⚠️ <i>Nenhum jogo com minuto ao vivo detectado no momento exato desta varredura.</i>\n\n`;
        }

        if (dadosPartidas.outros.length > 0) {
            mensagem += `━━━━━━━━━━━━━━━━━━━\n`;
            mensagem += `📋 <b>OUTROS JOGOS NA LISTA (${dadosPartidas.outros.length}):</b>\n\n`;
            let c = 1;
            for (const jogo of dadosPartidas.outros) {
                mensagem += `<b>#${c}</b> ⏳ <code>${jogo}</code>\n\n`;
                c++;
            }
        }

        // Envia o conteúdo respeitando o limite do Telegram (dividindo em blocos se necessário)
        if (mensagem.length > 3900) {
            // Se passar de 3900 caracteres, envia por partes
            await bot.sendMessage(CHAT_ID, `🔴 <b>[RADAR AO VIVO - PARTE 1]</b>\n\n` + mensagem.substring(0, 3800), { parse_mode: 'HTML' }).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));
            await bot.sendMessage(CHAT_ID, `🔴 <b>[RADAR AO VIVO - PARTE 2]</b>\n\n` + mensagem.substring(3800), { parse_mode: 'HTML' }).catch(() => {});
        } else {
            await bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'HTML' }).catch(() => {});
        }

        console.log("✅ Relatório consolidado enviado com sucesso ao Telegram!");

    } catch (error) {
        console.error("❌ Erro no Radar:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro Radar:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

executarRadarAoVivoGeral();
setInterval(executarRadarAoVivoGeral, 180000);
