export default function StateLayout() {
  return (
    <div className="page-slide-in">
      <h1>State Layout</h1>

      <p>
        This page documents the exact byte layout of all contract storage. Use this
        reference when reading state directly (without the SDK) or when debugging.
      </p>

      <h2 id="global-state">Global State</h2>

      <p>
        These keys are in the app&apos;s global state (accessible via <code>appl_account</code>):
      </p>

      <table>
        <thead>
          <tr>
            <th>Key</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>n</code></td>
            <td>uint64</td>
            <td>Number of tokens in the pool</td>
          </tr>
          <tr>
            <td><code>sumX</code></td>
            <td>uint64</td>
            <td>Sum of all reserves (∑xᵢ)</td>
          </tr>
          <tr>
            <td><code>sumXSq</code></td>
            <td>uint64</td>
            <td>Sum of squared reserves (∑xᵢ²)</td>
          </tr>
          <tr>
            <td><code>rInt</code></td>
            <td>uint64</td>
            <td>Interior radius (sum of interior tick radii)</td>
          </tr>
          <tr>
            <td><code>sBound</code></td>
            <td>uint64</td>
            <td>Boundary effective radius</td>
          </tr>
          <tr>
            <td><code>kBound</code></td>
            <td>uint64</td>
            <td>Boundary hyperplane offset</td>
          </tr>
          <tr>
            <td><code>totalR</code></td>
            <td>uint64</td>
            <td>Total liquidity (sum of all tick radii)</td>
          </tr>
          <tr>
            <td><code>virtualOffset</code></td>
            <td>uint64</td>
            <td>AMOUNT_SCALE factor (1000)</td>
          </tr>
          <tr>
            <td><code>fee_bps</code></td>
            <td>uint64</td>
            <td>Fee in basis points (e.g., 30 = 0.3%)</td>
          </tr>
          <tr>
            <td><code>numTicks</code></td>
            <td>uint64</td>
            <td>Number of active ticks</td>
          </tr>
        </tbody>
      </table>

      <h2 id="box-storage">Box Storage</h2>

      <p>
        Box storage is used for per-token, per-tick, and per-position data. Each box is
        accessed via <code>box_get(key)</code>.
      </p>

      <h3 id="reserves-box">reserves Box</h3>

      <p>
        Key: <code>&quot;reserves&quot;</code> (literal string)
      </p>

      <table>
        <thead>
          <tr>
            <th>Offset</th>
            <th>Size</th>
            <th>Field</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>0</td>
            <td>8 bytes</td>
            <td>reserves[0] (microunits)</td>
          </tr>
          <tr>
            <td>8</td>
            <td>8 bytes</td>
            <td>reserves[1]</td>
          </tr>
          <tr>
            <td>...</td>
            <td>...</td>
            <td>...</td>
          </tr>
          <tr>
            <td>(n-1)×8</td>
            <td>8 bytes</td>
            <td>reserves[n-1]</td>
          </tr>
        </tbody>
      </table>

      <p>
        Total size: <code>n × 8</code> bytes
      </p>

      <h3 id="fee-growth-box">fee_growth Box</h3>

      <p>
        Key: <code>&quot;fee_growth&quot;</code>
      </p>

      <table>
        <thead>
          <tr>
            <th>Offset</th>
            <th>Size</th>
            <th>Field</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>0</td>
            <td>8 bytes</td>
            <td>fee_growth[0] (per PRECISION)</td>
          </tr>
          <tr>
            <td>8</td>
            <td>8 bytes</td>
            <td>fee_growth[1]</td>
          </tr>
          <tr>
            <td>...</td>
            <td>...</td>
            <td>...</td>
          </tr>
        </tbody>
      </table>

      <p>
        Total size: <code>n × 8</code> bytes
      </p>

      <h3 id="token-boxes">Token Boxes</h3>

      <p>
        Key: <code>{`"token:{idx}"`}</code> where idx is 0 to n-1
      </p>

      <table>
        <thead>
          <tr>
            <th>Offset</th>
            <th>Size</th>
            <th>Field</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>0</td>
            <td>8 bytes</td>
            <td>ASA ID of token at index idx</td>
          </tr>
        </tbody>
      </table>

      <p>
        Total size: 8 bytes per box, n boxes total
      </p>

      <h3 id="tick-boxes">Tick Boxes</h3>

      <p>
        Key: <code>{`"tick:{id}"`}</code> where id is the tick ID (uint64)
      </p>

      <table>
        <thead>
          <tr>
            <th>Offset</th>
            <th>Size</th>
            <th>Field</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>0</td>
            <td>8 bytes</td>
            <td>r (sphere radius)</td>
          </tr>
          <tr>
            <td>8</td>
            <td>8 bytes</td>
            <td>k (hyperplane offset)</td>
          </tr>
          <tr>
            <td>16</td>
            <td>1 byte</td>
            <td>state (0=INTERIOR, 1=BOUNDARY)</td>
          </tr>
          <tr>
            <td>17</td>
            <td>8 bytes</td>
            <td>totalShares (LP shares in this tick)</td>
          </tr>
        </tbody>
      </table>

      <p>
        Total size: 25 bytes per tick
      </p>

      <h3 id="position-boxes">Position Boxes</h3>

      <p>
        Key: <code>{`"pos:{owner}{tickId}"`}</code> where owner is 32-byte address
      </p>

      <table>
        <thead>
          <tr>
            <th>Offset</th>
            <th>Size</th>
            <th>Field</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>0</td>
            <td>8 bytes</td>
            <td>shares (LP shares owned)</td>
          </tr>
          <tr>
            <td>8</td>
            <td>8 bytes</td>
            <td>fee_checkpoint[0]</td>
          </tr>
          <tr>
            <td>16</td>
            <td>8 bytes</td>
            <td>fee_checkpoint[1]</td>
          </tr>
          <tr>
            <td>...</td>
            <td>...</td>
            <td>...</td>
          </tr>
          <tr>
            <td>8 + n×8</td>
            <td>-</td>
            <td>(end)</td>
          </tr>
        </tbody>
      </table>

      <p>
        Total size: <code>8 + n × 8</code> bytes per position
      </p>

      <h2 id="reading-state-directly">Reading State Directly</h2>

      <p>
        To read state without the SDK:
      </p>

      <pre><code className="language-typescript">{`// Get global state
const appInfo = await algodClient.getApplicationByID(POOL_APP_ID).do();
const globalState = appInfo.params['global-state'];

// Decode reserves box
const reservesBox = await algodClient
  .getApplicationBoxByName(POOL_APP_ID, new Uint8Array(Buffer.from('reserves')))
  .do();
const reserves = [];
for (let i = 0; i < n; i++) {
  const offset = i * 8;
  const value = BigInt(
    '0x' + reservesBox.value.slice(offset, offset + 8).toString('hex')
  );
  reserves.push(value);
}`}</code></pre>

      <blockquote>
        <strong>Note:</strong> All multi-byte values are big-endian. Use <code>BigInt</code>
        for values that may exceed 2⁵³.
      </blockquote>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/protocol/smart-contract"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Smart Contract
        </a>
        <a
          href="/docs/protocol/swap-verification"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Swap Verification →
        </a>
      </div>
    </div>
  );
}
