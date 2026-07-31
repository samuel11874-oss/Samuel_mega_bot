const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V59 Ao Vivo ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarV59() {
    let browser = null;
    try {
        console.log("⚡ [Radar V59] Iniciando varredura otimizada de jogos ao vivo...");

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

        for (let i = 0; i < 4; i++) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await new Promise(r => setTimeout(r, 2000));
        }

        // Extração estruturada para pegar partidas ativas e filtrar categorias indesejadas
        const partidasMapeadas = await page.evaluate(() => {
            const unicasSet = new Set();
            const linhas = document.querySelectorAll('tr, .match-row, div');

            linhas.forEach(el => {
                const texto = el.innerText ? el.innerText.replace(/\s+/g, ' ').trim() : '';

                // Verifica se o bloco contém um confronto válido
                if ((texto.includes('vs') || texto.includes(' - ')) && texto.length > 15 && texto.length < 500) {
                    const textoLower = texto.toLowerCase();

                    // Ignora explicitamente pré-jogos que mostram "Hora" se não tiver andamento
                    const temHoraFutura = /hora\s*\d{2}:\d{2}/i.test(textoLower);
                    
                    // Filtros para remover Sub-19, Sub-20 e Feminino
                    const ehSub19ou20 = /sub\s*-?(19|20)|u\s*-?(19|20)/i.test(textoLower);
                    const ehFeminino = /\(w\)|\bwomen\b|feminino|\(f\)/i.test(textoLower);

                    if (!ehSub19ou20 && !ehFeminino && !temHoraFutura) {
                        unicasSet.add(texto);
                    }
                }
            });

            return Array.from(unicasSet);
        });

        console.log(`📊 Partidas válidas encontradas: ${partidasMapeadas.length}`);

        if (partidasMapeadas.length > 0) {
            let mensagem = `🔴 <b>[RADAR TOTALCORNER - AO VIVO]</b>\n`;
            mensagem += `🔥 Total de jogos filtrados: <code>${partidasMapeadas.length}</code>\n\n`;

            let blocoAtual = mensagem;
            let contador = 1;

            for (const partida of partidasMapeadas) {
                let linhaJogo = `<b>#${contador}</b>: <code>${partida}</code>\n\n`;
                
                if ((blocoAtual.length + linhaJogo.length) > 3800) {
                    await bot.sendMessage(CHAT_ID, blocoAtual, { parse_mode: 'HTML' }).catch(() => {});
                    await new Promise(r => setTimeout(r, 1000));
                    blocoAtual = `🔴 <b>[RADAR - CONTINUAÇÃO]</b>\n\n` + linhaJogo;
                } else {
                    blocoAtual += linhaJogo;
                }
                contador++;
            }

            if (blocoAtual.trim().length > 0) {
                await bot.sendMessage(CHAT_ID, blocoAtual, { parse_mode: 'HTML' }).catch(() => {});
            }

            console.log("✅ Relatório enviado com sucesso!");
        } else {
            console.log("ℹ️ Nenhuma partida encontrada.");
            await bot.sendMessage(CHAT_ID, `⚠️ <b>Aviso:</b> Nenhuma partida encontrada nesta varredura.`, { parse_mode: 'HTML' });
        }

    } catch (error) {
        console.error("❌ Erro V59:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro V59:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

executarRadarV59();
setInterval(executarRadarV59, 180000);
