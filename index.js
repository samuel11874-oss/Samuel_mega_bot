const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.get('/', (req, res) => res.send('Bot Detetive Ativo'));
app.listen(process.env.PORT || 3000);

async function detectarEstrutura() {
    console.log("🔍 [DETETIVE] Analisando o site...");
    
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/');
        const $ = cheerio.load(data);
        
        // Vamos tentar listar as classes das tabelas existentes
        $('table').each((i, el) => {
            console.log(`Tabela ${i} encontrada! Classes: ${$(el).attr('class')}`);
        });

        // Vamos imprimir o início do conteúdo da primeira tabela para eu ler a estrutura
        const tabelaExemplo = $('table').first().html();
        if (tabelaExemplo) {
            console.log("--- INÍCIO DO CÓDIGO DA TABELA ---");
            console.log(tabelaExemplo.substring(0, 500)); // Pega os primeiros 500 caracteres
            console.log("--- FIM DO CÓDIGO DA TABELA ---");
        } else {
            console.log("❌ Nenhuma tag <table> foi encontrada no site. Eles mudaram tudo para DIVs!");
        }

    } catch (error) {
        console.error("❌ Erro:", error.message);
    }
}

setInterval(detectarEstrutura, 60000);
detectarEstrutura();
