const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - V66 Oficial ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Memória global para evitar repetir jogos já enviados enquanto estiverem ativos
const jogosJaEnviados = new Set();

async function executarRadarV66() {
    let browser = null;
    try {
        console.log("⚡ [Radar V66] Varrendo apenas jogos legítimos em andamento...");

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
        
        console.log("🌐 Acessando TotalCorner...");
        await page.goto('https://www.totalcorner.com/pt/match/live', {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        await new Promise(r => setTimeout(r, 6000));

        for (let i = 0; i < 4; i++) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await new Promise(r => setTimeout(r, 2000));
        }

        const partidasAoVivo = await page.evaluate(() => {
            const validasSet = new Set();
            const blocos = document.querySelectorAll('tr, div.match-row');

            blocos.forEach(el => {
                const textoRaw = el.innerText || '';
                const texto = textoRaw.replace(/\s+/g, ' ').trim();
                const textoLower = texto.toLowerCase();

                if (texto.length > 15 && (texto.includes('vs') || texto.includes(' - '))) {
                    const htmlInner = el.innerHTML.toLowerCase();

                    // Critério rigoroso: O TotalCorner insere classes de andamento ou marcações de tempo real
                    const temAndamentoReal = htmlInner.includes('match_status_') || 
                                              htmlInner.includes('class="time') || 
                                              htmlInner.includes('cronometro') ||
                                              /\d{1,2}\s*['′]|ht|1ºt|2ºt/i.test(textoLower);

                    // Bloqueia explicitamente se contiver o padrão de data futura na linha (ex: 07/31 16:00)
                    const temDataFutura = /\d{2}\/\d{2}\s\d{2}:\d{2}/.test(texto);

                    // Filtros de base e feminino
                    const ehSub = /sub\s*-?(19|20|21|23)|u\s*-?(19|20|21|23)/i.test(textoLower);
                    const ehFem = /\(w\)|\bwomen\b|feminino|\(f\)/i.test(textoLower);

                    if (temAndamentoReal && !temDataFutura && !ehSub && !ehFem) {
                        validasSet.add(texto);
                    }
                }
            });

            return Array.from(validasSet);
        });

        // Filtra para remover o que já foi enviado anteriormente
        const novasPartidas = partidasAoVivo.filter(partida => !jogosJaEnviados.has(partida));

        console.log(`📊 Jogos encontrados agora: ${partidasAoVivo.length} | Novos para envio: ${novasPartidas.length}`);

        if (novasPartidas.length > 0) {
            let mensagem = `🔴 <b>[RADAR TOTALCORNER - NOVOS AO VIVO]</b>\n`;
            mensagem += `🔥 Partidas inéditas detectadas: <code>${novasPartidas.length}</code>\n\n`;

            let blocoAtual = mensagem;
            let contador = 1;

            for (const partida of novasPartidas) {
                // Adiciona na memória de enviados para nunca mais repetir
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
            console.log("✅ Novos jogos enviados ao Telegram com sucesso!");
        } else {
            console.log("ℹ️ Nenhum jogo novo encontrado nesta varredura (todos já foram enviados).");
        }

    } catch (error) {
        console.error("❌ Erro V66:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

executarRadarV66();
setInterval(executarRadarV66, 180000);
