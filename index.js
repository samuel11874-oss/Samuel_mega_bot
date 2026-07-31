const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Investigação V62 ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarInvestigacaoV62() {
    let browser = null;
    try {
        console.log("⚡ [Investigação V62] Iniciando modo detetive para achar apenas jogos em TEMPO REAL...");

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

        // Script de extração com depuração (debug)
        const dados = await page.evaluate(() => {
            const aoVivoSet = new Set();
            const logsInvestigacao = [];
            const blocos = document.querySelectorAll('tr, div.match-row, div.match-item');

            let count = 0;

            blocos.forEach(el => {
                const textoRaw = el.innerText || '';
                const texto = textoRaw.replace(/\s+/g, ' ').trim();

                // Verifica se é um bloco de jogo (tem "vs" ou " - ")
                if ((texto.includes('vs') || texto.includes(' - ')) && texto.length > 15 && texto.length < 500) {
                    const textoLower = texto.toLowerCase();

                    // 1. Investigando a presença de tempo
                    const temHora = textoLower.includes('hora'); // Jogo Futuro
                    const temMin = textoLower.includes('mín') || textoLower.includes('min'); // Jogo Atual
                    
                    // 2. Procurando cronômetro clássico (ex: 45', HT, 1ºT, 2ºT)
                    const temTempo = /(\d{1,3})\s*['′]|ht|1ºt|2ºt|intervalo/i.test(textoLower);
                    
                    // 3. A ARMA SECRETA: Jogo agendado não tem Ataque Perigoso rodando (ex: Perigo 14 - 5)
                    const temPerigoAtivo = /(perigo|danger)\s*\d+\s*-\s*\d+/i.test(textoLower);

                    // Só é AO VIVO se tiver o minuto rodando OU tiver ataques perigosos numéricos rolando
                    const ehAoVivoReal = (temMin || temTempo || temPerigoAtivo);
                    const ehFuturo = temHora;
                    
                    // Filtros para barrar categorias que você não quer
                    const ehSub = /sub\s*-?(19|20)|u\s*-?(19|20)/i.test(textoLower);
                    const ehFem = /\(w\)|\bwomen\b|feminino|\(f\)/i.test(textoLower);

                    // Salva as 10 primeiras leituras para lermos no log do Render
                    if (count < 10) {
                        logsInvestigacao.push(
                            `[JOGO ${count + 1}] LIDO: "${texto.substring(0, 60)}..." | TEM_HORA: ${temHora} | TEM_MINUTO: ${temMin} | PERIGO_ATIVO: ${temPerigoAtivo} | RESULTADO: ${ehAoVivoReal && !ehFuturo ? 'VAI PRO TELEGRAM' : 'BARRADO'}`
                        );
                        count++;
                    }

                    // CRITÉRIO FINAL ESTRITO: É ao vivo E NÃO tem "hora" E NÃO é base/feminino
                    if (ehAoVivoReal && !ehFuturo && !ehSub && !ehFem) {
                        aoVivoSet.add(texto);
                    }
                }
            });

            return {
                jogosAoVivo: Array.from(aoVivoSet),
                logs: logsInvestigacao
            };
        });

        // ==========================================
        // IMPRIMINDO A INVESTIGAÇÃO NO RENDER
        // ==========================================
        console.log("\n=========================================");
        console.log("🕵️ RESULTADO DA INVESTIGAÇÃO V62 (RAIO-X)");
        console.log("=========================================");
        dados.logs.forEach(log => console.log(log));
        console.log("=========================================\n");

        console.log(`📊 Jogos 100% em TEMPO REAL filtrados: ${dados.jogosAoVivo.length}`);

        if (dados.jogosAoVivo.length > 0) {
            let mensagem = `🔴 <b>[RADAR TOTALCORNER - TEMPO REAL]</b>\n`;
            mensagem += `🔥 Partidas rodando agora: <code>${dados.jogosAoVivo.length}</code>\n\n`;

            let blocoAtual = mensagem;
            let contador = 1;

            for (const partida of dados.jogosAoVivo) {
                let linhaJogo = `⏱ <b>#${contador}</b>\n<code>${partida}</code>\n\n`;
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
            console.log("✅ Lista de jogos estrita enviada ao Telegram!");
        } else {
            console.log("ℹ️ Nenhum jogo ao vivo encontrado.");
            await bot.sendMessage(CHAT_ID, `⚠️ <b>Aviso:</b> O bot checou a página mas não encontrou nenhum jogo em andamento no momento.`, { parse_mode: 'HTML' });
        }

    } catch (error) {
        console.error("❌ Erro V62:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ Erro: ${error.message}`, { parse_mode: 'HTML' });
    } finally {
        if (browser) await browser.close();
    }
}

executarInvestigacaoV62();
setInterval(executarInvestigacaoV62, 180000);
