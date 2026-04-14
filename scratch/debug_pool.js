const axios = require('axios');

async function check() {
    const appId = 758284478;
    const url = `https://testnet-api.algonode.cloud/v2/applications/${appId}`;
    try {
        const response = await axios.get(url);
        const gs = response.data.params['global-state'];
        
        console.log('Global State Keys:');
        gs.forEach(item => {
            const key = Buffer.from(item.key, 'base64').toString();
            console.log(key, item.value.uint);
        });
        
    } catch (e) {
        console.error(e.message);
    }
}

check();
