export default function DeployedAddresses() {
  return (
    <div className="page-slide-in">
      <h1>Deployed Addresses</h1>

      <p>
        Live deployment addresses for taurusSwap on Algorand testnet and mainnet.
      </p>

      <h2 id="testnet">Testnet Deployment</h2>

      <table>
        <thead>
          <tr>
            <th>Component</th>
            <th>ID / Address</th>
            <th>Explorer</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Pool App ID</strong></td>
            <td><code>758284478</code></td>
            <td>
              <a href="https://testnet.algoexplorer.io/application/758284478" target="_blank" rel="noopener noreferrer">
                View on AlgoExplorer →
              </a>
            </td>
          </tr>
        </tbody>
      </table>

      <h3 id="testnet-tokens">Pool Tokens (Testnet)</h3>

      <table>
        <thead>
          <tr>
            <th>Token</th>
            <th>ASA ID</th>
            <th>Decimals</th>
            <th>Explorer</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>USDC</td>
            <td><code>10458941</code></td>
            <td>6</td>
            <td>
              <a href="https://testnet.algoexplorer.io/asset/10458941" target="_blank" rel="noopener noreferrer">
                View →
              </a>
            </td>
          </tr>
          <tr>
            <td>USDT</td>
            <td><code>67395862</code></td>
            <td>6</td>
            <td>
              <a href="https://testnet.algoexplorer.io/asset/67395862" target="_blank" rel="noopener noreferrer">
                View →
              </a>
            </td>
          </tr>
          <tr>
            <td>USDD</td>
            <td><code>84436122</code></td>
            <td>6</td>
            <td>
              <a href="https://testnet.algoexplorer.io/asset/84436122" target="_blank" rel="noopener noreferrer">
                View →
              </a>
            </td>
          </tr>
          <tr>
            <td>BUSD</td>
            <td><code>84436329</code></td>
            <td>6</td>
            <td>
              <a href="https://testnet.algoexplorer.io/asset/84436329" target="_blank" rel="noopener noreferrer">
                View →
              </a>
            </td>
          </tr>
          <tr>
            <td>TUSD</td>
            <td><code>84437236</code></td>
            <td>6</td>
            <td>
              <a href="https://testnet.algoexplorer.io/asset/84437236" target="_blank" rel="noopener noreferrer">
                View →
              </a>
            </td>
          </tr>
        </tbody>
      </table>

      <h3 id="testnet-faucet">Testnet Faucet</h3>

      <p>
        Get test tokens for the taurusSwap pool:
      </p>

      <ul>
        <li>
          <strong>Faucet URL:</strong>{' '}
          <a href="/faucet">/faucet</a> (built into the app)
        </li>
        <li>
          <strong>Algorand Faucet:</strong>{' '}
          <a href="https://bank.testnet.algorand.network" target="_blank" rel="noopener noreferrer">
            https://bank.testnet.algorand.network
          </a>
        </li>
      </ul>

      <h2 id="mainnet">Mainnet Deployment</h2>

      <div className="p-4 bg-yellow/20 border-2 border-dark-green rounded-lg">
        <p className="font-bold text-dark-green">
          ⚠️ Not Yet Deployed
        </p>
        <p className="text-dark-green/80 text-sm mt-1">
          Mainnet deployment is planned for Q2 2026. Addresses will be updated here
          and announced on Twitter/GitHub.
        </p>
      </div>

      <h2 id="contract-urls">Contract URLs</h2>

      <ul>
        <li>
          <strong>GitHub:</strong>{' '}
          <a href="https://github.com/Kaushik2003/taurusSwap" target="_blank" rel="noopener noreferrer">
            github.com/Kaushik2003/taurusSwap
          </a>
        </li>
        <li>
          <strong>AlgoExplorer (Testnet):</strong>{' '}
          <a href="https://testnet.algoexplorer.io/application/758284478" target="_blank" rel="noopener noreferrer">
            Application 758284478
          </a>
        </li>
      </ul>

      <h2 id="verifying-deployment">Verifying Deployment</h2>

      <p>
        To verify you&apos;re interacting with the correct contract:
      </p>

      <pre><code className="language-bash">{`# Get app info via goal
goal app info --app-id 758284478

# Or via Python SDK
python3 -c "
import algosdk
client = algosdk.AlgodClient('TOKEN', 'https://testnet-api.algonode.cloud', '')
info = client.application(758284478)
print('Approval hash:', info['params']['approval-program'])
"`}</code></pre>

      <blockquote>
        <strong>Security note:</strong> Always verify the app ID before signing
        transactions. Phishing sites may deploy fake contracts.
      </blockquote>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/reference/constants"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Constants
        </a>
        <a
          href="/docs/reference/paper"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Paper →
        </a>
      </div>
    </div>
  );
}
