const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Estatísticas Completas ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const jogosProcessados = new Set();

async function radarCompletoSokkerPRO() {
    let browser = null;
    try {
        console.log("⚡ [Radar] Conectando ao SokkerPRO...");

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

        console.log("⏳ Aguardando carregamento da lista de jogos...");
        await new Promise(r => setTimeout(r, 6000));

        // Rrola a página para garantir que os jogos ao vivo apareçam
        for (let i = 0; i < 5; i++) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await new Promise(r => setTimeout(r, 1500));
        }

        // Extrai os links diretos das partidas ao vivo na página principal
        const linksPartidas = await page.evaluate(() => {
            const links = [];
            // Procura por âncoras ou elementos clicáveis que contenham 'fixture'
            const elementos = document.querySelectorAll('a, div[onclick], tr');
            
            elementos.forEach(el => {
                const href = el.getAttribute('href') || '';
                const onclick = el.getAttribute('onclick') || '';
                const texto = el.innerText || '';

                // Identifica se é um jogo ao vivo (contém minutos ou placar)
                if (/\b(\d{1,2}\s*['′]|HT|FT)\b/i.test(texto)) {
                    if (href.includes('fixture=')) {
                        const urlCompleta = href.startsWith('http') ? href : 'https://m.sokkerpro.com/' + href;
                        if (!links.includes(urlCompleta)) links.push(urlCompleta);
                    }
                }
            });

            // Fallback: se não achar links por <a>, pega todos os links da página que tenham fixture
            if (links.length === 0) {
                document.querySelectorAll('a').forEach(a => {
                    const h = a.getAttribute('href') || '';
                    if (h.includes('fixture=')) {
                        links.push(h.startsWith('http') ? h : 'https://m.sokkerpro.com/' + h);
                    }
                });
            }

            return [...new Set(links)]; // Remove duplicados
        });

        console.log(`📊 Links de partidas ao vivo encontrados: ${linksPartidas.length}`);

        // Varre cada link de partida individualmente para extrair as estatísticas completas
        for (const link of linksPartidas) {
            if (jogosProcessados.has(link)) continue; // Evita reprocessar o mesmo jogo toda hora

            try {
                const paginaJogo = await browser.newPage();
                await paginaJogo.goto(link, { waitUntil: 'networkidle0', timeout: 30000 });
                await new Promise(r => setTimeout(r, 3000));

                // Extrai as estatísticas detalhadas de dentro da página da partida
                const dadosPartida = await paginaJogo.evaluate(() => {
                    const textoGeral = document.body.innerText || '';
                    
                    // Extrai blocos de texto úteis para montar o card igual ao seu print
                    const linhas = textoGeral.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    
                    return {
                        conteudoBruto: linhas.slice(0, 45).join('\n') // Pega o topo com placar, liga e estatísticas principais
                    };
                });

                await paginaJogo.close();

                if (dadosPartida.conteudoBruto.length > 30) {
                    jogosProcessados.add(link);

                    // Monta o card limpo e organizado estilo o seu print
                    let cardTelegram = `🏟 <b>RADAR DE ESTATÍSTICAS - SOKKERPRO</b>\n`;
                    cardTelegram += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                    cardTelegram += `<code>${dadosPartida.conteudoBruto}</code>\n`;
                    cardTelegram += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                    cardTelegram += `🔗 <a href="${link}">Ver no SokkerPRO</a>`;

                    await bot.sendMessage(CHAT_ID, cardTelegram, { parse_mode: 'HTML', disable_web_page_preview: true }).catch(() => {});
                    await new Promise(r => setTimeout(r, 2000));
                }

            } catch (errJogo) {
                console.log(`⚠️ Erro ao ler partida específica: ${errJogo.message}`);
            }
        }

        console.log("✅ Ciclo de varredura de estatísticas finalizado!");

    } catch (erro) {
        console.error("❌ Erro geral no radar:", erro.message);
    } finally {
        if (browser) await browser.close();
    }
}

radarCompletoSokkerPRO();
setInterval(radarCompletoSokkerPRO, 300000); // Roda a cada 5 minutos para processar os jogos com calma
