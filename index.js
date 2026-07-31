const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - V71 Card Moderno ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Memória de antiduplicidade
const jogosJaEnviados = new Set();

async function executarRadarV71() {
    let browser = null;
    try {
        console.log("⚡ [Radar V71] Varrendo e formatando cards modernos...");

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
        
        console.log("🌐 Acessando TotalCorner Today...");
        await page.goto('https://www.totalcorner.com/pt/match/today', {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        console.log("⏳ Aguardando carregamento e rolando a página...");
        await new Promise(r => setTimeout(r, 6000));

        for (let i = 0; i < 4; i++) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await new Promise(r => setTimeout(r, 2000));
        }

        // Extrai e limpa os dados estruturados de cada partida ao vivo
        const partidasAoVivo = await page.evaluate(() => {
            const listaPartidas = [];
            const blocos = document.querySelectorAll('div, tr');

            blocos.forEach(el => {
                const textoInterno = el.innerText ? el.innerText.replace(/\s+/g, ' ').trim() : '';

                if ((textoInterno.includes('vs') || textoInterno.includes(' - ')) && 
                    textoInterno.length > 15 && textoInterno.length < 500) {
                    
                    const textoLower = textoInterno.toLowerCase();
                    const temMinutoRodando = /mín|min|\b\d{1,2}\s*['′]\b/i.test(textoLower);

                    const ehSub = /sub\s*-?(19|20|21)|u\s*-?(19|20|21)/i.test(textoLower);
                    const ehFem = /\(w\)|\bwomen\b|feminino|\(f\)/i.test(textoLower);

                    if (temMinutoRodando && !ehSub && !ehFem) {
                        const matchMinuto = textoInterno.match(/(?:mín|min)\s*[:]?\s*(\d+\s*['′]?)/i) || 
                                            textoInterno.match(/(\d{1,3}\s*['′])/);
                        
                        const minutoExtraido = matchMinuto ? matchMinuto[1].trim() : "Ao Vivo";
                        const chaveUnica = textoInterno.substring(0, 40);

                        if (!listaPartidas.some(p => p.chave === chaveUnica)) {
                            listaPartidas.push({
                                chave: chaveUnica,
                                textoCompleto: textoInterno,
                                minuto: minutoExtraido
                            });
                        }
                    }
                }
            });

            return listaPartidas;
        });

        const novasPartidas = partidasAoVivo.filter(p => !jogosJaEnviados.has(p.chave));

        console.log(`📊 Jogos ao vivo encontrados: ${partidasAoVivo.length} | Novos para envio: ${novasPartidas.length}`);

        if (novasPartidas.length > 0) {
            let blocoAtual = `⚽ <b>RADAR DE ESCANTEIOS - AO VIVO</b>\n`;
            blocoAtual += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

            let contador = 1;

            for (const partida of novasPartidas) {
                jogosJaEnviados.add(partida.chave);

                // Limpeza e formatação moderna do card
                let linhaCard = `🔴 <b>[${partida.minuto}] Partida #${contador}</b>\n`;
                linhaCard += `<code>${partida.textoCompleto}</code>\n`;
                linhaCard += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
                
                if ((blocoAtual.length + linhaCard.length) > 3800) {
                    await bot.sendMessage(CHAT_ID, blocoAtual, { parse_mode: 'HTML' }).catch(() => {});
                    await new Promise(r => setTimeout(r, 1000));
                    blocoAtual = `⚽ <b>RADAR (CONTINUAÇÃO)</b>\n━━━━━━━━━━━━━━━━━━━━━━\n\n` + linhaCard;
                } else {
                    blocoAtual += linhaCard;
                }
                contador++;
            }

            if (blocoAtual.trim().length > 0) {
                await bot.sendMessage(CHAT_ID, blocoAtual, { parse_mode: 'HTML' }).catch(() => {});
            }

            console.log("✅ Cards modernos enviados com sucesso ao Telegram!");
        } else {
            console.log("ℹ️ Nenhum jogo novo encontrado nesta varredura.");
        }

    } catch (error) {
        console.error("❌ Erro V71:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro V71:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

executarRadarV71();
setInterval(executarRadarV71, 180000);
