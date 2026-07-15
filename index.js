const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.get('/', (req, res) => res.send('Detetive de Classes Ativo'));
app.listen(process.env.PORT || 3000);

async function mapearEstrutura() {
    console.log("🔍 [MAPEAMENTO] Varrendo novas classes...");
    
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/');
        const $ = cheerio.load(data);
        
        const classesEncontradas = new Set();
        
        // Vamos procurar todas as DIVs e pegar suas classes
        $('div').each((i, el) => {
            const className = $(el).attr('class');
            if (className) {
                classesEncontradas.add(className);
            }
        });

        console.log("--- LISTA DE CLASSES ENCONTRADAS ---");
        classesEncontradas.forEach(c => console.log(c));
        console.log("--- FIM DA LISTA ---");

    } catch (error) {
        console.error("❌ Erro ao mapear:", error.message);
    }
}

setInterval(mapearEstrutura, 60000);
mapearEstrutura();
