const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Alertas Individuais ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const placaresMemoria = new Map();

async function monitorarGolsIndividual() {
    let browser = null;
    try {
        console.log("⚡ [Radar Individual] Conectando ao SokkerPRO...");

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

        // Rola a página para carregar todos os jogos
        for (let i = 0; i < 6; i++) {
            await page.evaluate(() => window.scrollBy(0, 800));
            await new Promise(r => setTimeout(r, 1500));
        }

        // Extração dos dados limpos
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
                            
                            // Tenta extrair linhas para separar Liga, Times e Tempo
                            const partesLinhas = texto.split('\n').map(p => p.trim()).filter(p => p.length > 0);
                            
                            lista.push({
                                chave: texto.substring(0, 50),
                                textoBruto: texto,
                                placarAtual: placar,
                                linhasDetalhadas: partesLinhas
                            });
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

        console.log(`📊 Partidas processadas: ${partidasDetectadas.length}`);

        for (const partida of partidasDetectadas) {
            // Filtra categorias indesejadas (sub e feminino)
            if (/sub-?\d{2}|\(w\)|women|feminino/i.test(partida.chave)) continue;

            if (!placaresMemoria.has(partida.chave)) {
                placaresMemoria.set(partida.chave, partida.placarAtual);
            } else {
                const placarAntigo = placaresMemoria.get(partida.chave);

                if (placarAntigo !== partida.placarAtual) {
                    // 🚨 GOL DETECTADO! Vamos estruturar o card individual perfeito.
                    placaresMemoria.set(partida.chave, partida.placarAtual);

                    // Tenta organizar as informações de forma limpa baseada no texto bruto
                    let linhas = partida.linhasDetalhadas;
                    let liga = linhas.length > 0 ? linhas[0] : "Futebol Ao Vivo";
                    let tempo = "Ao Vivo";
                    
                    // Procura o tempo (minuto, HT, FT)
                    for (const l of linhas) {
                        if (l.includes("'") || l.includes("HT") || l.includes("FT") || /^\d{1,3}\s*['′]/.test(l)) {
                            tempo = l;
                            break;
                        }
                    }

                    let cardIndividual = `⚽🔥 **GOOOOL! - SOKKERPRO AO VIVO** 🔥⚽\n`;
                    cardIndividual += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                    cardIndividual += `🏆 **Liga / Competição:** ${liga}\n`;
                    cardIndividual += `⏱ **Tempo de Jogo:** ${tempo}\n`;
                    cardIndividual += `⚔️ **Confronto:** <code>${partida.textoBruto}</code>\n`;
                    cardIndividual += `📊 **Novo Placar:** <code>${partida.placarAtual}</code>\n`;
                    cardIndividual += `━━━━━━━━━━━━━━━━━━━━━━`;

                    console.log(`⚽ GOL INDIVIDUAL ENVIADO: ${partida.placarAtual}`);
                    await bot.sendMessage(CHAT_ID, cardIndividual, { parse_mode: 'HTML' }).catch(() => {});
                    await new Promise(r => setTimeout(r, 1500));
                }
            }
        }

        console.log("✅ Ciclo concluído.");

    } catch (erro) {
        console.error("❌ Erro:", erro.message);
    } finally {
        if (browser) await browser.close();
    }
}

monitorarGolsIndividual();
setInterval(monitorarGolsIndividual, 120000);
