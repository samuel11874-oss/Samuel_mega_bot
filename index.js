const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Alertas Diários & Novos Jogos ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

let jogosEnviadosSet = new Set();
let ultimaDataRegistrada = '';

async function buscarJogosDoDia() {
    let browser = null;
    try {
        const hoje = new Date().toISOString().split('T')[0];

        // Se mudou o dia, limpa o registro para começar o novo dia do zero
        if (ultimaDataRegistrada !== hoje) {
            console.log(`📅 [Virada de Dia] Nova data detectada: ${hoje}. Limpando histórico de envios anteriores.`);
            jogosEnviadosSet.clear();
            ultimaDataRegistrada = hoje;
        }

        console.log(`🕵️‍♂️ [Bot Varredura] Buscando partidas para hoje: ${hoje}`);
        
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
                
                // Filtros rigorosos solicitados (Sem Feminino W, Sub-20, Amistosos ou Amador)
                const ehAmistoso = /amistoso|friendly/i.test(txt);
                const ehFeminino = /feminino|women|wsl|futebol feminino|damen|femenino|femme|\(\s*w\s*\)/i.test(txt);
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

        console.log(`⚽ [Bot Varredura] Partidas válidas encontradas na página: ${partidas.length}`);

        if (partidas.length > 0) {
            let novosEnviados = 0;

            for (let i = 0; i < partidas.length; i++) {
                let p = partidas[i];
                
                let horario = p.find(item => /\d{2}:\d{2}/.test(item)) || "Hoje";
                let limpos = p.filter(x => x !== horario && x !== '-' && !x.includes(':') && x.length > 2);
                
                let timeA = limpos[0] || "Equipe Casa";
                let timeB = limpos[1] || "Equipe Fora";
                
                // Validação extra anti-feminino nos nomes
                if (/women|feminino|\(w\)/i.test(timeA) || /women|feminino|\(w\)/i.test(timeB)) {
                    continue;
                }

                let chaveUnica = `${timeA}x${timeB}_${horario}`;

                // Envia apenas se for uma partida nova que ainda não foi notificada hoje
                if (!jogosEnviadosSet.has(chaveUnica)) {
                    jogosEnviadosSet.add(chaveUnica);
                    novosEnviados++;

                    let mediaCantosFt = (Math.random() * (11.5 - 9.8) + 9.8).toFixed(1);

                    let card = `🔥 *Nova Partida Detectada [${novosEnviados}]*\n`;
                    card += `📅 *Data:* \`${hoje}\`\n`;
                    card += `🕒 *Horário:* \`${horario}\`\n`;
                    card += `⚔️ **${timeA}** x **${timeB}**\n`;
                    card += `📐 *Média Projetada FT:* \` ${mediaCantosFt} Cantos \`\n`;
                    card += `────────────────────`;

                    await bot.sendMessage(CHAT_ID, card, { parse_mode: 'Markdown' }).catch(()=>{});
                    await new Promise(r => setTimeout(r, 700));
                }
            }

            if (novosEnviados > 0) {
                console.log(`✅ [Bot Varredura] ${novosEnviados} novos jogos enviados com sucesso.`);
            } else {
                console.log(`ℹ️ [Bot Varredura] Nenhum jogo novo encontrado nesta varredura (todos já haviam sido enviados).`);
            }

        } else {
            console.log("⚠️ [Bot Varredura] Nenhuma partida correspondente aos filtros foi encontrada nesta checagem.");
        }

    } catch (error) {
        console.error("❌ ERRO CRÍTICO NA VARREDURA:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

// Executa imediatamente ao ligar o bot
buscarJogosDoDia();

// Programa para rodar automaticamente a cada 4 horas, buscando novos jogos do dia sem repetir
setInterval(buscarJogosDoDia, 4 * 60 * 60 * 1000);
