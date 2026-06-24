# Cinonix — Migración de Stripe a pagos USDC (ETH / BNB / SOL)

## Qué cambié

1. **`api/verificar-pago.js`** (nuevo)
   Endpoint serverless de Vercel. Recibe `{ txid, network, idToken }`, verifica
   la identidad del usuario con Firebase Admin, comprueba que el TXID no se
   haya usado antes, consulta la transacción real en Etherscan / BscScan / RPC
   de Solana, y solo si el pago es válido (≥ MIN_USDC, a tu wallet, en USDC)
   activa `subscriptionActive: true` en Firestore usando una transacción
   atómica (evita que el mismo TXID se use dos veces en una carrera).

2. **`004pago.html`**
   - Quitado el enlace a `buy.stripe.com`.
   - Precio mostrado en USDC en lugar de EUR.
   - Selector de red (ETH / BNB / SOL) que muestra la dirección de cobro
     correspondiente con botón de copiar.
   - El botón final lleva a `005confirmacion.html` (igual que antes, solo
     que ya no iniciaba ningún cobro con Stripe).

3. **`005confirmacion.html`**
   - Eliminado el `updateDoc(... subscriptionActive: true ...)` que el
     **cliente** ejecutaba directamente. Esto era el agujero de seguridad
     real: cualquier persona podía abrir la consola del navegador y
     activarse la suscripción gratis sin pagar nada, con solo tener sesión
     iniciada.
   - Ahora pide el TXID de la transacción + red, llama a
     `POST /api/verificar-pago` con el `idToken` del usuario, y la activación
     ocurre exclusivamente en el backend tras verificar el pago on-chain.

4. **`app.js`**
   - Eliminada la función gemela `validarPagoEnConfirmacion` que también
     activaba la suscripción desde el cliente (mismo problema que el punto 3,
     solo que vivía en este archivo compartido).

5. **`package.json`**
   - Añadido `firebase-admin` como dependencia (lo necesita el endpoint).

6. **`firestore.rules`** (nuevo, no existía en el repo)
   - Reglas recomendadas para impedir, a nivel de base de datos, que el
     cliente escriba `subscriptionActive`, `paymentTxid`, etc. en su propio
     documento. El backend (Admin SDK) los puede escribir porque el Admin SDK
     no está sujeto a las reglas de seguridad de Firestore.
   - **Esto es importante incluso con el backend nuevo**: si tus reglas
     actuales permiten `update` libre sobre `usuarios/{uid}`, alguien podría
     seguir auto-activándose llamando a `updateDoc` directamente desde la
     consola del navegador, sin pasar por tu endpoint. Cópialas en Firebase
     Console → Firestore Database → Reglas (revisa antes que no choquen con
     otras reglas que ya tengas para otras colecciones).

7. **`.env.example`** (nuevo)
   - Lista de variables de entorno que debes configurar en Vercel.

## Lo que tienes que hacer tú (no lo puedo hacer yo)

- [ ] Crear/obtener tus wallets de cobro (ETH/BNB comparten dirección al ser
      ambas EVM; Solana necesita una dirección distinta).
- [ ] Poner esas direcciones en `004pago.html` (busca `PON_AQUI_TU_WALLET...`).
- [ ] Configurar las variables de entorno en Vercel según `.env.example`
      (`FIREBASE_SERVICE_ACCOUNT`, `WALLET_ETH_BNB`, `WALLET_SOL`,
      `ETHERSCAN_API_KEY`, `BSCSCAN_API_KEY`).
- [ ] Generar la clave de cuenta de servicio de Firebase (Project Settings →
      Service Accounts → Generate new private key) y pegar el JSON en
      `FIREBASE_SERVICE_ACCOUNT`.
- [ ] Sacar API keys gratuitas en etherscan.io y bscscan.com.
- [ ] Pegar `firestore.rules` en la consola de Firebase.
- [ ] Hacer `npm install` (o que Vercel lo haga en el build) para que
      `firebase-admin` quede instalado.
- [ ] Probar el flujo completo con una transacción real pequeña antes de
      lanzarlo a producción.

## Nota sobre 002registro.html / dashboard.js

No los he tocado: no usan Stripe ni tocan `subscriptionActive` de forma
insegura. Si quieres que los revise también, dímelo.
