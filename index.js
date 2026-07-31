const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Rastreador e Gols ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Memória inteligente: Guarda o jogo e o placar atual
// Formato: { "Time A vs Time B": "1 - 0" }
const jogosAtivos = new Map();

async function monitorarSokkerPRO() {
    let browser = null;
    try {
        console.log("⚡ Iniciando varredura profunda no SokkerPRO...");

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
        
        await page.goto('https://m.sokkerpro.com/', {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        await new Promise(r => setTimeout(r, 5000));

        // Tenta clicar na aba "AO VIVO" para filtrar apenas o que importa
        await page.evaluate(() => {
            const botoes = Array.from(document.querySelectorAll('div, span, button'));
            const btnAoVivo = botoes.find(el => el.innerText && el.innerText.includes('AO VIVO') && el.innerText.match(/\d+/));
            if (btnAoVivo) btnAoVivo.click();
        });

        console.log("⏳ Rolando a página para carregar todos os jogos...");
        // 8 rolagens para garantir que puxe todos os 48+ jogos listados
        for (let i = 0; i < 8; i++) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await new Promise(r => setTimeout(r, 2000));
        }

        // Extração cirúrgica baseada nas quebras de linha dos seus prints
        const partidasExtraidas = await page.evaluate(() => {
            const resultados = [];
            const elementos = document.querySelectorAll('div');

            elementos.forEach(el => {
                if (el.children.length > 15) return; // Ignora containers gigantes

                const texto = el.innerText ? el.innerText.trim() : '';
                const linhas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);

                if (linhas.length >= 6) {
                    // Procura o padrão de placar: duas linhas seguidas contendo apenas números (ex: "4" e "0")
                    for (let i = 0; i < linhas.length - 1; i++) {
                        if (/^\d+$/.test(linhas[i]) && /^\d+$/.test(linhas[i+1])) {
                            if (i >= 2) {
                                // Puxa o minuto/tempo do jogo
                                const tempoMatch = linhas.slice(0, i).join(' ').match(/\b(\d{1,3}['′]|INT|HT|\d{2}:\d{2})\b/);
                                
                                if (tempoMatch) {
                                    // Limpa os times (tira porcentagem de pressão e caracteres estranhos)
                                    const timeA = linhas[i-2].replace(/\d+%/, '').replace(/🟥|🟨/g, '').trim();
                                    const timeB = linhas[i-1].replace(/\d+%/, '').replace(/🟥|🟨/g, '').trim();
                                    const scoreA = parseInt(linhas[i], 10);
                                    const scoreB = parseInt(linhas[i+1], 10);
                                    const tempo = tempoMatch[1];

                                    // Filtro para garantir que não pegou lixo
                                    if (timeA.length > 2 && timeB.length > 2 && isNaN(timeA)) {
                                        resultados.push({ timeA, timeB, scoreA, scoreB, tempo });
                                    }
                                }
                            }
                            break; // Vai para o próximo bloco após achar o placar
                        }
                    }
                }
            });

            // Remove duplicatas que o site possa ter gerado na rolagem
            const unicos = [];
            const vistos = new Set();
            for (let r of resultados) {
                const chaveUnica = `${r.timeA} - ${r.timeB}`;
                if (!vistos.has(chaveUnica)) {
                    vistos.add(chaveUnica);
                    unicos.push(r);
                }
            }
            return unicos;
        });

        console.log(`📊 Total de jogos processados: ${partidasExtraidas.length}`);

        // Lógica de GOLS e NOVOS JOGOS
        for (const partida of partidasExtraidas) {
            const chaveJogo = `${partida.timeA} vs ${partida.timeB}`;
            const placarAtual = `${partida.scoreA} - ${partida.scoreB}`;

            // Ignora jogos femininos e sub se preferir (opcional, adicionei proteção básica)
            const nomeLower = chaveJogo.toLowerCase();
            if (/sub\s*-?(19|20|21)|u\s*-?(19|20|21)|\(w\)|\bwomen\b|feminino/.test(nomeLower)) {
                continue; 
            }

            if (!jogosAtivos.has(chaveJogo)) {
                // JOGO NOVO ENCONTRADO
                jogosAtivos.set(chaveJogo, placarAtual);
                
                let cardNovo = `🔴 <b>NOVO JOGO AO VIVO</b>\n`;
                cardNovo += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                cardNovo += `⏱ <b>Tempo:</b> ${partida.tempo}\n`;
                cardNovo += `⚔️ <code>${partida.timeA} ${partida.scoreA} x ${partida.scoreB} ${partida.timeB}</code>\n`;
                cardNovo += `━━━━━━━━━━━━━━━━━━━━━━`;
                
                await bot.sendMessage(CHAT_ID, cardNovo, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 1000));

            } else {
                // JOGO JÁ EXISTE NA MEMÓRIA - VERIFICAR SE O PLACAR MUDOU
                const placarAntigo = jogosAtivos.get(chaveJogo);
                
                if (placarAntigo !== placarAtual) {
                    jogosAtivos.set(chaveJogo, placarAtual); // Atualiza a memória com o novo placar

                    let cardGol = `⚽🔥 <b>GOOOOOOOL DETECTADO!</b>\n`;
                    cardGol += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                    cardGol += `⏱ <b>Tempo:</b> ${partida.tempo}\n`;
                    cardGol += `🚨 <b>NOVO PLACAR:</b>\n`;
                    cardGol += `⚔️ <code>${partida.timeA} ${partida.scoreA} x ${partida.scoreB} ${partida.timeB}</code>\n`;
                    cardGol += `━━━━━━━━━━━━━━━━━━━━━━`;

                    await bot.sendMessage(CHAT_ID, cardGol, { parse_mode: 'HTML' }).catch(() => {});
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        }

        console.log("✅ Varredura concluída. Memória atualizada!");

    } catch (erro) {
        console.error("❌ Erro no monitoramento:", erro.message);
    } finally {
        if (browser) await browser.close();
    }
}

// Inicia e roda a cada 2 minutos (120000 ms) para pegar os gols rapidamente
monitorarSokkerPRO();
setInterval(monitorarSokkerPRO, 120000);
