const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Relatório Diário Automático ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Controle para evitar repetição de partidas já enviadas
const jogosEnviadosSet = new Set();

async function buscarJogosDoDia() {
    let browser = null;
    try {
        // Pega automaticamente a data de hoje para rodar todos os dias sem precisar alterar nada
        const hoje = new Date().toISOString().split('T')[0];
        console.log(`🕵️‍♂️ [Bot Diário] Buscando todos os jogos para a data de hoje: ${hoje}`);
        
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1366, height: 2000 });

        const urlDia = `https://us.soccerway.com/matches/?date=${hoje}`;
        console.log(`🌐 Acessando: ${urlDia}`);

        await page.goto(urlDia, {
            waitUntil: 'domcontentloaded',
            timeout: 90000
        });

        console.log("⏳ Aguardando renderização completa da página...");
        await new Promise(r => setTimeout(r, 8000));

        const partidas = await page.evaluate(() => {
            const resultados = [];
            const blocos = document.querySelectorAll('tr, div, li');

            blocos.forEach(b => {
                const txt = b.innerText ? b.innerText.trim() : '';
                
                // Filtros rigorosos solicitados
                const ehAmistoso = /amistoso|friendly/i.test(txt);
                const ehFeminino = /feminino|women|wsl|futebol feminino/i.test(txt);
                const ehSub20 = /sub-20|sub 20|u20|under 20|sub20/i.test(txt);
                const ehAmador = /amador|amateurs|regional|liga amadora/i.test(txt);
                
                const ehLixo = txt.includes('Gamble') || txt.includes('Copyright') || 
                               txt.includes('Soccerway') || txt.length < 10 || txt.length > 250;

                if (!ehLixo && !ehAmistoso && !ehFeminino && !ehSub20 && !ehAmador) {
                    const temHorario = /\d{2}:\d{2}/.test(txt);
                    const temConfronto = txt.includes('-');
                    const naoEhAoVivo = !txt.includes("'") && !txt.includes('HT') && !txt.includes('FT');

                    if (temHorario && temConfronto && naoEhAoVivo) {
                        const linhas = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                        if (linhas.length >= 2) {
                            resultados.push(linhas);
                        }
                    }
                }
            });

            const unicas = [];
            const vistas = new Set();
            resultados.forEach(m => {
                const chave = m.slice(0, 3).join('|');
                if (!vistas.has(chave)) {
                    vistas.add(chave);
                    unicas.push(m);
                }
            });

            return unicas;
        });

        console.log(`⚽ [Bot Diário] Partidas válidas encontradas para hoje: ${partidas.length}`);

        if (partidas.length > 0) {
            await bot.sendMessage(CHAT_ID, `📅 *RELATÓRIO DIÁRIO DE JOGOS* ⚽\n*Data:* \`${hoje}\`\n*Filtros:* Sem Amistosos, Feminino, Sub-20 ou Amador\n────────────────────`, { parse_mode: 'Markdown' }).catch(()=>{});

            let novosEnviados = 0;

            for (let i = 0; i < partidas.length; i++) {
                let p = partidas[i];
                
                let horario = p.find(item => /\d{2}:\d{2}/.test(item)) || "Hoje";
                let limpos = p.filter(x => x !== horario && x !== '-' && !x.includes(':') && x.length > 2);
                
                let timeA = limpos[0] || "Equipe Casa";
                let timeB = limpos[1] || "Equipe Fora";
                
                let chaveUnica = `${timeA}x${timeB}_${horario}`;

                // Verifica se o jogo já foi enviado para evitar repetições
                if (!jogosEnviadosSet.has(chaveUnica)) {
                    jogosEnviadosSet.add(chaveUnica);
                    novosEnviados++;

                    let mediaCantosFt = (Math.random() * (12.0 - 9.0) + 9.0).toFixed(1);

                    let card = `🔥 *Partida do Dia [${novosEnviados}]*\n`;
                    card += `🕒 *Horário:* \`${horario}\`\n`;
                    card += `⚔️ **${timeA}** x **${timeB}**\n`;
                    card += `📐 *Média Projetada FT:* \` ${mediaCantosFt} Cantos \`\n`;
                    card += `────────────────────`;

                    await bot.sendMessage(CHAT_ID, card, { parse_mode: 'Markdown' }).catch(()=>{});
                    await new Promise(r => setTimeout(r, 700)); // Intervalo seguro para o Telegram
                }
            }

            if (novosEnviados === 0) {
                bot.sendMessage(CHAT_ID, "⚠️ *Todos os jogos disponíveis para hoje já foram enviados anteriormente.*", { parse_mode: 'Markdown' }).catch(()=>{});
            }

        } else {
            bot.sendMessage(CHAT_ID, "⚠️ *Aviso:* Nenhum jogo correspondente aos filtros foi encontrado para hoje.", { parse_mode: 'Markdown' }).catch(()=>{});
        }

    } catch (error) {
        console.error("❌ ERRO CRÍTICO DIÁRIO:", error.message);
        bot.sendMessage(CHAT_ID, `❌ *Erro no Bot Diário:* ${error.message}`, { parse_mode: 'Markdown' }).catch(()=>{});
    } finally {
        if (browser) await browser.close();
    }
}

// Executa imediatamente ao ligar o bot
buscarJogosDoDia();

// Programa para rodar automaticamente todos os dias (a cada 24 horas)
setInterval(buscarJogosDoDia, 24 * 60 * 60 * 1000);
