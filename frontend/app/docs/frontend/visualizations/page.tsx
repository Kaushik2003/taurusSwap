'use client';

import Link from 'next/link';

const animations = [
  {
    id: '01_sphere_amm',
    title: '01 · Sphere AMM',
    caption: 'Reserves x ∈ ℝⁿ live on the sphere Σ(r − xᵢ)² = r². Every trade slides the point along the surface.',
    mathConcept: 'The sphere invariant constrains reserves to an n-dimensional sphere surface.',
    sourceFile: 'components/animation/SphereAmm.tsx',
    livePath: '/trade',
  },
  {
    id: '02_polar_decomposition',
    title: '02 · Polar Decomposition',
    caption: 'Reserves decomposed into α (equal-price axis) and w (orthogonal trading component).',
    mathConcept: 'x = αv + w splits reserves into price-direction and trading components.',
    sourceFile: 'components/animation/PolarDecomposition.tsx',
    livePath: '/trade',
  },
  {
    id: '03_ticks_and_caps',
    title: '03 · Ticks and Caps',
    caption: 'Ticks cut spherical caps around the equal-price point. When reserves hit the boundary, the tick is exhausted.',
    mathConcept: 'Each tick is a spherical cap defined by hyperplane x · v = k.',
    sourceFile: 'components/animation/TicksAndCaps.tsx',
    livePath: '/pool',
  },
  {
    id: '04_consolidation',
    title: '04 · Consolidation to Torus',
    caption: 'Multiple ticks collapse into a single torus: interior sphere swept around boundary circle.',
    mathConcept: 'Interior ticks sum linearly; boundary ticks contribute effective radius.',
    sourceFile: 'components/animation/Consolidation.tsx',
    livePath: '/pool/add',
  },
  {
    id: '05_trade_execution',
    title: '05 · Trade Execution',
    caption: 'A swap moves the reserve point along the torus surface. The invariant is verified on-chain.',
    mathConcept: 'The torus invariant is evaluated after each trade segment.',
    sourceFile: 'components/animation/TradeExecution.tsx',
    livePath: '/trade',
  },
  {
    id: '06_seeding_process',
    title: '06 · Pool Seeding',
    caption: 'Initial liquidity deposit creates the first tick and sets the pool state.',
    mathConcept: 'The first LP defines r and k, establishing the initial sphere.',
    sourceFile: 'components/animation/SeedingProcess.tsx',
    livePath: '/pool/add',
  },
];

export default function Visualizations() {
  return (
    <div className="page-slide-in">
      <h1>Visualizations Gallery</h1>

      <p>
        This page showcases all Three.js animations used throughout taurusSwap.
        Each animation illustrates a mathematical concept from the Orbital AMM paper.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {animations.map((anim) => (
          <div key={anim.id} className="docs-card">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="w-full rounded-lg border-2 border-dark-green mb-4"
            >
              <source src={`/docs/animations/${anim.id}.mp4`} type="video/mp4" />
              Your browser does not support the video tag.
            </video>

            <h3 className="text-lg font-bold text-dark-green mb-2">
              {anim.title}
            </h3>

            <p className="text-sm text-dark-green/80 mb-4">
              {anim.caption}
            </p>

            <div className="p-3 bg-dark-green/5 rounded-lg border border-dark-green/20 mb-4">
              <p className="text-xs font-medium text-dark-green">
                Mathematical Concept:
              </p>
              <p className="text-xs text-dark-green/70 mt-1">
                {anim.mathConcept}
              </p>
            </div>

            <div className="flex gap-2">
              <a
                href={`https://github.com/Kaushik2003/taurusSwap/blob/main/frontend/${anim.sourceFile}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-3 py-2 text-xs font-bold text-dark-green bg-white border-2 border-dark-green rounded-lg hover:bg-dark-green/10 transition-colors text-center"
              >
                View Source
              </a>
              <Link
                href={anim.livePath}
                className="flex-1 px-3 py-2 text-xs font-bold text-white bg-[#6ea96a] border-2 border-dark-green rounded-lg hover:bg-dark-green/90 transition-colors text-center"
              >
                Launch Interactive
              </Link>
            </div>
          </div>
        ))}
      </div>

      <h2 id="using-animations-in-docs">Using Animations in Docs</h2>

      <p>
        To embed an animation in a docs page, use the <code>AnimationEmbed</code> component:
      </p>

      <pre><code className="language-tsx">{`import AnimationEmbed from '@/components/docs/AnimationEmbed';

<AnimationEmbed
  src="/docs/animations/01_sphere_amm.mp4"
  title="01 · Sphere AMM"
  caption="Reserves live on the sphere..."
  tsxSource={sphereAmmSourceCode}  // Optional: show Three.js code
/>`}</code></pre>

      <h2 id="animation-specifications">Animation Specifications</h2>

      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Resolution</td>
            <td>1920×1080 (16:9)</td>
          </tr>
          <tr>
            <td>Frame Rate</td>
            <td>60 FPS</td>
          </tr>
          <tr>
            <td>Duration</td>
            <td>10-15 seconds (looping)</td>
          </tr>
          <tr>
            <td>Format</td>
            <td>MP4 (H.264)</td>
          </tr>
          <tr>
            <td>Camera</td>
            <td>Perspective, FOV 45°</td>
          </tr>
          <tr>
            <td>Palette</td>
            <td>Green #9FE870, Cyan #00c4d9, Pink #ff5b7a, Yellow #f2d15f</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-border">
        <a
          href="/docs/frontend/data-hooks"
          className="text-dark-green/70 hover:text-dark-green font-medium"
        >
          ← Data Hooks
        </a>
        <a
          href="/docs/reference/glossary"
          className="px-4 py-2 bg-[#6ea96a] text-white font-bold rounded-lg border-2 border-dark-green hover:bg-dark-green/90 transition-colors"
        >
          Reference: Glossary →
        </a>
      </div>
    </div>
  );
}
