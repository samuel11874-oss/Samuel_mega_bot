const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar Estrito Ao Vivo ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarEstritoAoVivo() {
    let browser = null;
    try {
        console.log("⚡ [Radar Estrito] Buscando apenas jogos com minuto (Mín) ativo...");

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

        // Rolagem para carregar todos os blocos ativos
        for (let i = 0; i < 4; i++) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await new Promise(r => setTimeout(r, 2000));
        }

        // Extração com exigência OBRIGATÓRIA do campo "Mín" ou formato de minuto (ex: 48')
        const partidasAoVivoReais = await page.evaluate(() => {
            const unicasSet = new Set();
            const elementos = document.querySelectorAll('tr, div');

            elementos.forEach(el => {
                const texto = el.innerText ? el.innerText.replace(/\s+/g, ' ').trim() : '';

                // Critério rigoroso: Deve ter confronto E obrigatoriamente conter a indicação de minuto ("Mín" ou número com ')
                const temConfronto = texto.includes('vs') || texto.includes(' - ');
                const temMinutoAoVivo = texto.includes('Mín') || /\d+'/.test(texto);

                if (temConfronto && temMinutoAoVivo && texto.length > 15 && texto.length < 600) {
                    const textoLower = texto.toLowerCase();

                    // Filtros para excluir Sub-19, Sub-20 e Feminino
                    const ehSub19ou20 = /sub\s*-?(19|20)|u\s*-?(19|20)/i.test(textoLower);
                    const ehFeminino = /\(w\)|\bwomen\b|feminino|\(f\)/i.test(textoLower);

                    if (!ehSub19ou20 && !ehFeminino) {
                        unicasSet.add(texto);
                    }
                }
            });

            return Array.from(unicasSet);
        });

        console.log(`📊 Jogos realmente ao vivo encontrados: ${partidasAoVivoReais.length}`);

        if (partidasAoVivoReais.length > 0) {
            let mensagem = `🔴 <b>[RADAR TOTALCORNER - AO VIVO REAL]</b>\n`;
            mensagem += `🔥 Jogos rolando no cronômetro: <code>${partidasAoVivoReais.length}</code>\n\n`;

            let blocoAtual = mensagem;
            let contador = 1;

            for (const partida of partidasAoVivoReais) {
                // Extrai o minuto exato para o destaque do card
                const matchMinuto = partida.match(/(\d+['′])/);
                const tempoInfo = matchMinuto ? `⏱ <b>[${matchMinuto[0]}]</b>` : `⏱ <b>[AO VIVO]</b>`;

                let linhaJogo = `${tempoInfo} <b>#${contador}</b>\n<code>${partida}</code>\n\n`;
                
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

            console.log("✅ Relatório de jogos ao vivo reais enviado com sucesso!");
        } else {
            console.log("ℹ️ Nenhum jogo ao vivo com minuto ativo no momento.");
            await bot.sendMessage(CHAT_ID, `⚠️ <b>Aviso:</b> Nenhum jogo ao vivo com cronômetro ativo encontrado no momento.`, { parse_mode: 'HTML' });
        }

    } catch (error) {
        console.error("❌ Erro no Radar:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro Radar:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

executarRadarEstritoAoVivo();
setInterval(executarRadarEstritoAoVivo, 180000);
