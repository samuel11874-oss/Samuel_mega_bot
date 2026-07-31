const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar Consolidado ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarConsolidado() {
    let browser = null;
    try {
        console.log("⚡ [Radar Consolidado] Coletando jogos únicos sem repetição...");

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

        // Rolagem para garantir o carregamento completo de todos os jogos ativos
        for (let i = 0; i < 4; i++) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await new Promise(r => setTimeout(r, 2000));
        }

        // Extração garantindo itens únicos (sem duplicidade)
        const partidasUnicas = await page.evaluate(() => {
            const unicasSet = new Set();
            const trs = document.querySelectorAll('tr');

            trs.forEach((tr, index) => {
                const texto = tr.innerText.replace(/\s+/g, ' ').trim();
                // Ignora o cabeçalho e pega linhas válidas de confronto
                if (index > 0 && (texto.includes('vs') || texto.includes(' - ')) && texto.length > 10) {
                    unicasSet.add(texto);
                }
            });

            return Array.from(unicasSet);
        });

        console.log(`📊 Total de partidas únicas encontradas: ${partidasUnicas.length}`);

        if (partidasUnicas.length > 0) {
            let mensagem = `🔴 <b>[RADAR TOTALCORNER - AO VIVO]</b>\n`;
            mensagem += `🔥 Total de jogos únicos: <code>${partidasUnicas.length}</code>\n\n`;

            let blocoAtual = mensagem;
            let contador = 1;

            for (const partida of partidasUnicas) {
                let linhaJogo = `<b>#${contador}</b>: <code>${partida}</code>\n\n`;
                
                // Se o bloco aproximar do limite do Telegram (~3800 caracteres), envia e inicia o próximo
                if ((blocoAtual.length + linhaJogo.length) > 3800) {
                    await bot.sendMessage(CHAT_ID, blocoAtual, { parse_mode: 'HTML' }).catch(() => {});
                    await new Promise(r => setTimeout(r, 1000));
                    blocoAtual = `🔴 <b>[RADAR TOTALCORNER - CONTINUAÇÃO]</b>\n\n` + linhaJogo;
                } else {
                    blocoAtual += linhaJogo;
                }
                contador++;
            }

            // Envia o bloco final restante
            if (blocoAtual.trim().length > 0) {
                await bot.sendMessage(CHAT_ID, blocoAtual, { parse_mode: 'HTML' }).catch(() => {});
            }

            console.log("✅ Todos os jogos enviados de forma limpa e sem repetição!");
        } else {
            console.log("ℹ️ Nenhuma partida encontrada.");
            await bot.sendMessage(CHAT_ID, `⚠️ <b>Aviso:</b> Nenhuma partida encontrada nesta varredura.`, { parse_mode: 'HTML' });
        }

    } catch (error) {
        console.error("❌ Erro no Radar:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro Radar:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

executarRadarConsolidado();
setInterval(executarRadarConsolidado, 180000);
