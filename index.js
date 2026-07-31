const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V67 Ao Vivo ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Memória para garantir que NUNCA vamos repetir um jogo já enviado
const jogosJaEnviados = new Set();

async function executarRadarV67() {
    let browser = null;
    try {
        console.log("⚡ [Radar V67] Iniciando varredura de jogos ao vivo...");

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

        // Extração direta de todas as linhas de partidas ativas na página live
        const partidasAoVivo = await page.evaluate(() => {
            const unicasSet = new Set();
            const linhas = document.querySelectorAll('tr, div.match-row');

            linhas.forEach(el => {
                const texto = el.innerText ? el.innerText.replace(/\s+/g, ' ').trim() : '';

                // Verifica se é uma linha de confronto válida
                if ((texto.includes('vs') || texto.includes(' - ')) && texto.length > 15 && texto.length < 600) {
                    const textoLower = texto.toLowerCase();

                    // Filtros para barrar Sub-19/20 e Feminino
                    const ehSub19ou20 = /sub\s*-?(19|20|21)|u\s*-?(19|20|21)/i.test(textoLower);
                    const ehFeminino = /\(w\)|\bwomen\b|feminino|\(f\)/i.test(textoLower);

                    if (!ehSub19ou20 && !ehFeminino) {
                        unicasSet.add(texto);
                    }
                }
            });

            return Array.from(unicasSet);
        });

        // Filtra para pegar apenas os jogos que AINDA NÃO foram enviados
        const novasPartidas = partidasAoVivo.filter(partida => !jogosJaEnviados.has(partida));

        console.log(`📊 Jogos encontrados: ${partidasAoVivo.length} | Novos para envio: ${novasPartidas.length}`);

        if (novasPartidas.length > 0) {
            let mensagem = `🔴 <b>[RADAR TOTALCORNER - AO VIVO]</b>\n`;
            mensagem += `🔥 Novas partidas detectadas: <code>${novasPartidas.length}</code>\n\n`;

            let blocoAtual = mensagem;
            let contador = 1;

            for (const partida of novasPartidas) {
                // Adiciona na memória para nunca mais repetir este jogo
                jogosJaEnviados.add(partida);

                let linhaJogo = `⏱ <b>#${contador} [AO VIVO]</b>\n<code>${partida}</code>\n\n`;
                
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

            console.log("✅ Relatório de novos jogos enviado com sucesso ao Telegram!");
        } else {
            console.log("ℹ️ Nenhum jogo novo encontrado nesta varredura.");
        }

    } catch (error) {
        console.error("❌ Erro V67:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro V67:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

executarRadarV67();
setInterval(executarRadarV67, 180000);
