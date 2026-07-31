const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Ligas Principais & Ao Vivo ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const placaresMemoria = new Map();

// Filtro de exclusão para divisões inferiores e categorias de base
const termosExcluidos = /sub-?\d{2}|sub\d|u\d{2}|u\d{1}|junior|youth|feminino|women|\(w\)|amador|regional|bta|reserva|friendly|amistoso/i;

function ehLigaPrincipal(textoLiga) {
    if (termosExcluidos.test(textoLiga)) return false;
    const padroesPrincipais = /primera|premier|serie a|serie b|bundesliga|ligue 1|ligue 2|eredivisie|primeira|championship|segunda|división|division|pro league|super lig|superleague/i;
    return padroesPrincipais.test(textoLiga);
}

async function varrerEEnviarJogosAoVivo() {
    let browser = null;
    try {
        console.log("⚡ [Radar Ao Vivo] Conectando ao SokkerPRO...");

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

        console.log(`📊 Partidas detectadas no total: ${partidasDetectadas.length}`);

        let contadorEnviados = 0;

        for (const partida of partidasDetectadas) {
            let linhas = partida.linhasDetalhadas;
            let liga = linhas.length > 0 ? linhas[0] : "Futebol Ao Vivo";

            // Aplica o filtro de ligas principais (primeira e segunda divisão)
            if (!ehLigaPrincipal(liga) && !ehLigaPrincipal(partida.chave)) {
                continue; 
            }

            // Identifica o tempo de jogo
            let tempo = "Ao Vivo";
            for (const l of linhas) {
                if (l.includes("'") || l.includes("HT") || l.includes("FT") || /^\d{1,3}\s*['′]/.test(l)) {
                    tempo = l;
                    break;
                }
            }

            // Se ainda não está na memória, registra e envia o card ao vivo
            if (!placaresMemoria.has(partida.chave)) {
                placaresMemoria.set(partida.chave, partida.placarAtual);

                let cardIndividual = `⚽🟢 **SOKKERPRO AO VIVO** 🟢⚽\n`;
                cardIndividual += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                cardIndividual += `🏆 **Competição:** ${liga}\n`;
                cardIndividual += `⏱ **Tempo de Jogo:** ${tempo}\n`;
                cardIndividual += `⚔️ **Confronto:** <code>${partida.textoBruto}</code>\n`;
                cardIndividual += `📊 **Placar Atual:** <code>${partida.placarAtual}</code>\n`;
                cardIndividual += `━━━━━━━━━━━━━━━━━━━━━━`;

                await bot.sendMessage(CHAT_ID, cardIndividual, { parse_mode: 'HTML' }).catch(() => {});
                contadorEnviados++;
                await new Promise(r => setTimeout(r, 1500)); // Intervalo curto entre cards para não floodar o Telegram
            } else {
                // Se já está na memória, verifica se o placar mudou (GOL!)
                const placarAntigo = placaresMemoria.get(partida.chave);

                if (placarAntigo !== partida.placarAtual) {
                    placaresMemoria.set(partida.chave, partida.placarAtual);

                    let cardGol = `⚽🔥 **GOOOOL! - SOKKERPRO AO VIVO** 🔥⚽\n`;
                    cardGol += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                    cardGol += `🏆 **Competição:** ${liga}\n`;
                    cardGol += `⏱ **Tempo de Jogo:** ${tempo}\n`;
                    cardGol += `⚔️ **Confronto:** <code>${partida.textoBruto}</code>\n`;
                    cardGol += `📊 **Novo Placar:** <code>${partida.placarAtual}</code>\n`;
                    cardGol += `━━━━━━━━━━━━━━━━━━━━━━`;

                    await bot.sendMessage(CHAT_ID, cardGol, { parse_mode: 'HTML' }).catch(() => {});
                    await new Promise(r => setTimeout(r, 1500));
                }
            }
        }

        console.log(`✅ Varredura concluída. ${contadorEnviados} novos jogos das principais ligas enviados.`);

    } catch (erro) {
        console.error("❌ Erro:", erro.message);
    } finally {
        if (browser) await browser.close();
    }
}

// Roda a varredura imediatamente ao iniciar (para trazer os jogos que estão rolando agora)
varrerEEnviarJogosAoVivo();

// Repete a checagem a cada 2 minutos para pegar novos jogos e gols em andamento
setInterval(varrerEEnviarJogosAoVivo, 120000);
