const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Alerta de Gols Pro ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Memória de placares para rastrear os gols com precisão
const placaresMemoria = new Map();

async function monitorarGolsPro() {
    let browser = null;
    try {
        console.log("⚡ [Radar Pro] Conectando ao SokkerPRO...");

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
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36');

        await page.goto('https://m.sokkerpro.com/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log("⏳ Carregando os jogos ao vivo...");
        await new Promise(r => setTimeout(r, 7000));

        // Roda a página para garantir que todos os 48+ jogos carreguem
        for (let i = 0; i < 6; i++) {
            await page.evaluate(() => window.scrollBy(0, 800));
            await new Promise(r => setTimeout(r, 1500));
        }

        // Extração organizada dos dados da tela
        const partidasDetectadas = await page.evaluate(() => {
            const lista = [];
            const blocos = document.querySelectorAll('div');

            blocos.forEach(el => {
                const texto = el.innerText ? el.innerText.replace(/\s+/g, ' ').trim() : '';
                
                if (texto.includes(' - ') && (texto.includes("'") || texto.includes('HT') || texto.includes('FT'))) {
                    const linhas = texto.split(' ').filter(l => l.trim().length > 0);
                    
                    for (let i = 0; i < linhas.length - 1; i++) {
                        if (/^\d{1,2}$/.test(linhas[i]) && /^\d{1,2}$/.test(linhas[i+1])) {
                            const placar = `${linhas[i]} x ${linhas[i+1]}`;
                            const partes = texto.split(/[\d\s]+x[\d\s]+/);
                            
                            if (partes.length >= 2) {
                                lista.push({
                                    chave: texto.substring(0, 50),
                                    textoBruto: texto,
                                    placarAtual: placar
                                });
                            }
                            break;
                        }
                    }
                }
            });

            // Remove duplicatas
            const unicos = [];
            const vistos = new Set();
            for (const item of lista) {
                if (!vistos.has(item.chave)) {
                    vistos.add(item.chave);
                    unicos.push(item);
                }
            }
            return unicos;
        });

        console.log(`📊 Partidas analisadas: ${partidasDetectadas.length}`);

        for (const partida of partidasDetectadas) {
            // Filtra categorias indesejadas (sub e feminino)
            if (/sub-?\d{2}|\(w\)|women|feminino/i.test(partida.chave)) continue;

            if (!placaresMemoria.has(partida.chave)) {
                // Cadastra na memória silenciosamente para começar a rastrear os gols
                placaresMemoria.set(partida.chave, partida.placarAtual);
            } else {
                const placarAntigo = placaresMemoria.get(partida.chave);

                if (placarAntigo !== partida.placarAtual) {
                    // 🚨 GOL DETECTADO! O placar mudou!
                    placaresMemoria.set(partida.chave, partida.placarAtual);

                    let cardFormatado = `⚽🔥 **GOOOOOOOL DETECTADO!** 🔥⚽\n`;
                    cardFormatado += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                    cardFormatado += `🏟 **Jogo / Confronto:**\n<code>${partida.textoBruto}</code>\n\n`;
                    cardFormatado += `⚽ **Novo Resultado:** <code>${partida.placarAtual}</code> (Anterior: ${placarAntigo})\n`;
                    cardFormatado += `━━━━━━━━━━━━━━━━━━━━━━`;

                    console.log(`⚽ GOL! ${partida.placarAtual} em ${partida.chave}`);
                    await bot.sendMessage(CHAT_ID, cardFormatado, { parse_mode: 'HTML' }).catch(() => {});
                    await new Promise(r => setTimeout(r, 1500));
                }
            }
        }

        console.log("✅ Varredura de gols finalizada com sucesso.");

    } catch (erro) {
        console.error("❌ Erro no monitoramento:", erro.message);
    } finally {
        if (browser) await browser.close();
    }
}

// Roda imediatamente e repete a cada 2 minutos para pegar os gols instantaneamente
monitorarGolsPro();
setInterval(monitorarGolsPro, 120000);
