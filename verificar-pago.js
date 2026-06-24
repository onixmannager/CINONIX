// api/verificar-pago.js
// Función serverless de Vercel: verifica TXID de USDC en ETH / SOL
// y activa la suscripción en Firestore de forma segura (sin confiar en el cliente).

const admin = require('firebase-admin');

// ── Firebase Admin (inicialización única) ─────────────────────────────────
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    )
  });
}
const db = admin.firestore();

// ── Constantes ────────────────────────────────────────────────────────────
// Contratos USDC oficiales
const USDC_ETH      = '0x74c571BD55c89C221C8172248A8C1986f6d44132'; // 6 decimales
const USDC_SOL_MINT = '3opWXJirY4VtqD5xRT6by7wcMh9ZjMJLkLg9LvfNhvit';

// Firma del evento Transfer(address,address,uint256) en EVM
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Wallets de destino (se leen de variables de entorno de Vercel)
const WALLET_EVM = (process.env.WALLET_ETH || '').toLowerCase(); // address ETH
const WALLET_SOL = process.env.WALLET_SOL || '';

// Monto mínimo aceptado (con margen de 0.5 por fees de red)
const MIN_USDC = parseFloat(process.env.MIN_USDC || '19.5');

// ── Validación básica de formato de TXID (evita inyección de basura en las URLs de las APIs) ──
const TXID_EVM_RE = /^0x[a-fA-F0-9]{64}$/;
const TXID_SOL_RE = /^[1-9A-HJ-NP-Za-km-z]{64,100}$/; // base58, longitud típica de firma Solana

// ── Verificación EVM (ETH) ────────────────────────────────────────────────
async function verificarEVM(txid) {
  const key    = process.env.ETHERSCAN_API_KEY || '';
  const base   = 'https://api.etherscan.io/api';
  const usdc   = USDC_ETH;
  const dec    = 1e6; // USDC-ETH 6 decimales

  if (!WALLET_EVM)
    return { ok: false, msg: 'Wallet ETH no configurada en el servidor.' };

  // 1. Recibo de la transacción (confirma que fue exitosa)
  const rcptUrl = `${base}?module=proxy&action=eth_getTransactionReceipt&txhash=${txid}&apikey=${key}`;
  const rcptRes = await fetch(rcptUrl);
  const rcptJson = await rcptRes.json();
  const receipt = rcptJson.result;

  if (!receipt)
    return { ok: false, msg: `Transacción no encontrada en ETH. Espera la confirmación y vuelve a intentarlo.` };
  if (receipt.status !== '0x1')
    return { ok: false, msg: `La transacción fue rechazada / falló en ETH.` };

  // 2. Buscar en los logs el evento Transfer hacia nuestra wallet
  for (const log of receipt.logs || []) {
    // Verificar contrato y firma del evento
    if (log.address?.toLowerCase() !== usdc) continue;
    if (log.topics?.[0] !== TRANSFER_TOPIC) continue;

    // topics[2] = dirección destino (con padding de 32 bytes)
    const to = '0x' + (log.topics[2] || '').slice(26).toLowerCase();
    if (to !== WALLET_EVM) continue;

    // Decodificar monto desde los datos del log
    let amount = Number(BigInt(log.data)) / dec;

    if (amount < MIN_USDC)
      return { ok: false, msg: `Monto insuficiente: ${amount.toFixed(2)} USDC enviados. Mínimo requerido: ${MIN_USDC} USDC.` };

    return { ok: true, amount, network: 'ETH' };
  }

  return {
    ok: false,
    msg: `No se encontró ninguna transferencia de USDC ≥${MIN_USDC} a la wallet de Cinonix en ETH. Comprueba que la red y la dirección son correctas.`
  };
}

// ── Verificación Solana ───────────────────────────────────────────────────
async function verificarSOL(txid) {
  if (!WALLET_SOL)
    return { ok: false, msg: 'Wallet de Solana no configurada en el servidor.' };

  const rpc = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

  const res = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getTransaction',
      params: [txid, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }]
    })
  });

  if (!res.ok)
    return { ok: false, msg: 'Error al consultar la RPC de Solana. Intenta de nuevo.' };

  const json = await res.json();
  const tx = json.result;

  if (!tx)
    return { ok: false, msg: 'Transacción de Solana no encontrada. Espera la confirmación (aprox. 30 seg) e intenta de nuevo.' };
  if (tx.meta?.err)
    return { ok: false, msg: `La transacción de Solana falló: ${JSON.stringify(tx.meta.err)}` };

  const pre  = tx.meta?.preTokenBalances  || [];
  const post = tx.meta?.postTokenBalances || [];

  for (const postBal of post) {
    if (postBal.mint !== USDC_SOL_MINT) continue;        // solo USDC
    if (postBal.owner !== WALLET_SOL)   continue;        // solo nuestra wallet

    const preBal  = pre.find(p => p.accountIndex === postBal.accountIndex);
    const preAmt  = preBal?.uiTokenAmount?.uiAmount  ?? 0;
    const postAmt = postBal.uiTokenAmount?.uiAmount   ?? 0;
    const diff    = postAmt - preAmt;

    if (diff < MIN_USDC)
      return { ok: false, msg: `Monto insuficiente: ${diff.toFixed(2)} USDC recibidos. Mínimo: ${MIN_USDC} USDC.` };

    return { ok: true, amount: diff, network: 'SOL' };
  }

  return {
    ok: false,
    msg: `No se encontró transferencia de USDC ≥${MIN_USDC} hacia la wallet de Cinonix en Solana. Verifica que enviaste a la dirección correcta.`
  };
}

// ── Handler principal ─────────────────────────────────────────────────────
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Método no permitido.' });

  const { txid, network, idToken } = req.body || {};

  if (!txid || !network || !idToken)
    return res.status(400).json({ error: 'Parámetros requeridos: txid, network, idToken.' });

  const txidClean = String(txid).trim();
  const netClean  = String(network).trim().toUpperCase();

  // 0. Validar formato del TXID antes de tocar ninguna API externa
  if (netClean === 'ETH') {
    if (!TXID_EVM_RE.test(txidClean))
      return res.status(400).json({ error: 'Formato de TXID inválido para una red EVM (debe ser 0x + 64 caracteres hexadecimales).' });
  } else if (netClean === 'SOL') {
    if (!TXID_SOL_RE.test(txidClean))
      return res.status(400).json({ error: 'Formato de TXID inválido para Solana.' });
  } else {
    return res.status(400).json({ error: `Red no soportada: ${netClean}. Usa ETH o SOL.` });
  }

  // 1. Verificar identidad del usuario con Firebase Admin
  let uid;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o expirada. Inicia sesión de nuevo.' });
  }

  // 2. ¿Ya tiene suscripción activa?
  const userRef  = db.collection('usuarios').doc(uid);
  const userSnap = await userRef.get();
  if (userSnap.exists && userSnap.data()?.subscriptionActive === true)
    return res.status(200).json({ ok: true, yaActivo: true });

  // 3. ¿Ya se usó este TXID en otra cuenta?
  const txSnap = await db.collection('transacciones').where('txid', '==', txidClean).get();
  if (!txSnap.empty)
    return res.status(400).json({ error: 'Este TXID ya fue utilizado para activar otra cuenta. Contacta soporte si crees que es un error.' });

  // 4. Verificar la transacción en la blockchain
  let resultado;
  try {
    if      (netClean === 'ETH') resultado = await verificarEVM(txidClean);
    else if (netClean === 'SOL') resultado = await verificarSOL(txidClean);
  } catch (e) {
    console.error('[verificar-pago] Error blockchain:', e);
    return res.status(502).json({
      error: 'Error temporal al consultar la blockchain. Espera unos minutos e intenta de nuevo.'
    });
  }

  if (!resultado.ok)
    return res.status(400).json({ error: resultado.msg });

  // 5. Activar suscripción en Firestore + registrar TXID para evitar reusos
  //    (transacción atómica: si el TXID se intenta usar dos veces a la vez, solo una gana)
  try {
    const now = admin.firestore.FieldValue.serverTimestamp();
    const txRef = db.collection('transacciones').doc(); // doc nuevo con id aleatorio

    await db.runTransaction(async (t) => {
      // Re-chequeo dentro de la transacción para evitar condiciones de carrera
      const dupSnap = await t.get(
        db.collection('transacciones').where('txid', '==', txidClean).limit(1)
      );
      if (!dupSnap.empty) {
        throw new Error('TXID_DUPLICADO');
      }

      t.update(userRef, {
        subscriptionActive: true,
        afiliado:           true,
        referidoConfirmado: true,
        paymentMethod:      'crypto_usdc',
        paymentNetwork:     resultado.network,
        paymentTxid:        txidClean,
        paymentAmount:      resultado.amount,
        paymentDate:        now
      });

      t.set(txRef, {
        txid:      txidClean,
        network:   resultado.network,
        uid,
        amount:    resultado.amount,
        timestamp: now
      });
    });

    return res.status(200).json({ ok: true, amount: resultado.amount, network: resultado.network });

  } catch (e) {
    if (e.message === 'TXID_DUPLICADO') {
      return res.status(400).json({ error: 'Este TXID ya fue utilizado para activar otra cuenta. Contacta soporte si crees que es un error.' });
    }
    console.error('[verificar-pago] Error Firestore:', e);
    return res.status(500).json({
      error: 'Tu pago fue verificado pero hubo un error al activar la cuenta. Contacta soporte con tu TXID.'
    });
  }
};
