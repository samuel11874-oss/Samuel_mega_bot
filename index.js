const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Principais Ligas ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const placaresMemoria = new Map();

// Lista de termos que identificam divisões inferiores ou categorias de base para exclusão
const termosExcluidos = /sub-?\d{2}|sub\d|u\d{2}|u\d{1}|junior|youth|feminino|women|\(w\)|amador|regional|bta|reserva|friendly|amistoso/i;

// Função para validar se a liga pertence à elite ou segunda divisão principal
function ehLigaPrincipal(textoLiga) {
    if (termosExcluidos.test(textoLiga)) return false;

    // Identifica divisões principais e secundárias comuns (Série A, B, Premier, La Liga, 1. Division, 2. Bundesliga, etc.)
    const padroesPrincipais = /primera|premier|serie a|serie b|bundesliga|ligue 1|ligue 2|eredivisie|primeira|championship|segunda|división|division|pro league|super lig|superleague/i;
    
    return padroesPrincipais.test(textoLiga);
}

async function monitorarPrincipaisLigas() {
    let browser = null;
    try {
        console.log("⚡ [Radar Ligas Principais] Conectando ao SokkerPRO...");

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

        for (let i = 0; i < 6; i++) {
            await page.evaluate(() => window.scrollBy(0, 800));
            await new Promise(r => setTimeout(r, 1500));
        }

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

        console.log(`📊 Total de partidas lidas: ${partidasDetectadas.length}`);

        for (const partida of partidasDetectadas) {
            let linhas = partida.linhasDetalhadas;
            let liga = linhas.length > 0 ? linhas[0] : "Futebol Ao Vivo";

            // Aplica o filtro restrito para primeira e segunda divisões globais
            if (!ehLigaPrincipal(liga) && !ehLigaPrincipal(partida.chave)) {
                continue; // Pula ligas que não são da elite/segunda divisão principal
            }

            if (!placaresMemoria.has(partida.chave)) {
                placaresMemoria.set(partida.chave, partida.placarAtual);
            } else {
                const placarAntigo = placaresMemoria.get(partida.chave);

                if (placarAntigo !== partida.placarAtual) {
                    placaresMemoria.set(partida.chave, partida.placarAtual);

                    let tempo = "Ao Vivo";
                    for (const l of linhas) {
                        if (l.includes("'") || l.includes("HT") || l.includes("FT") || /^\d{1,3}\s*['′]/.test(l)) {
                            tempo = l;
                            break;
                        }
                    }

                    let cardIndividual = `⚽🔥 **GOOOOL! - SOKKERPRO AO VIVO** 🔥⚽\n`;
                    cardIndividual += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                    cardIndividual += `🏟 **SokkerPRO Ao Vivo**\n`;
                    cardIndividual += `🏆 **Competição:** ${liga}\n`;
                    cardIndividual += `⏱ **Tempo de Jogo:** ${tempo}\n`;
                    cardIndividual += `⚔️ **Confronto:** <code>${partida.textoBruto}</code>\n`;
                    cardIndividual += `📊 **Novo Placar:** <code>${partida.placarAtual}</code>\n`;
                    cardIndividual += `━━━━━━━━━━━━━━━━━━━━━━`;

                    console.log(`⚽ GOL EM LIGA PRINCIPAL DETECTADO: ${partida.placarAtual} (${liga})`);
                    await bot.sendMessage(CHAT_ID, cardIndividual, { parse_mode: 'HTML' }).catch(() => {});
                    await new Promise(r => setTimeout(r, 1500));
                }
            }
        }

        console.log("✅ Ciclo de varredura das principais ligas concluído.");

    } catch (erro) {
        console.error("❌ Erro:", erro.message);
    } finally {
        if (browser) await browser.close();
    }
}

monitorarPrincipaisLigas();
setInterval(monitorarPrincipaisLigas, 120000);
