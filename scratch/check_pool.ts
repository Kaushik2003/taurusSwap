import algosdk from 'algosdk';
// Correct import for local file in bun
import { readPoolState } from '../frontend/lib/orbital-sdk/index.ts';

async function check() {
    const algod = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '');
    const appId = 758284478;
    try {
        const state = await readPoolState(algod, appId);
        console.log('N:', state.n);
        console.log('Token IDs:', state.tokenAsaIds);
        console.log('Reserves:', state.actualReservesRaw.map(r => r.toString()));
        console.log('Decimals:', state.tokenDecimals);
    } catch (e) {
        console.error(e);
    }
}

check();
