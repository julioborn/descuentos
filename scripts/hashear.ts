// @ts-ignore
const bcrypt = require('bcryptjs');

async function generarHash() {
    const passwordPlano = 'playeroarg321';
    const hash = await bcrypt.hash(passwordPlano, 10);
    console.log('Hash generado:', hash);
}

generarHash();
