'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DocSearch from './DocSearch';

const navStructure = [
  {
    group: 'Introduction',
    items: [
      { label: 'What is Orbital?', href: '/docs/introduction/what-is-orbital' },
      { label: 'Why Algorand?', href: '/docs/introduction/why-algorand' },
      { label: 'Quickstart', href: '/docs/introduction/quickstart' },
    ],
  },
  {
    group: 'Math',
    items: [
      { label: 'Overview', href: '/docs/math/overview' },
      { label: 'Sphere AMM', href: '/docs/math/sphere-amm' },
      { label: 'Polar Decomposition', href: '/docs/math/polar-decomposition' },
      { label: 'Ticks and Caps', href: '/docs/math/ticks-and-caps' },
      { label: 'Consolidation', href: '/docs/math/consolidation' },
      { label: 'Torus Invariant', href: '/docs/math/torus-invariant' },
      { label: 'Capital Efficiency', href: '/docs/math/capital-efficiency' },
    ],
  },
  {
    group: 'Protocol',
    items: [
      { label: 'Architecture', href: '/docs/protocol/architecture' },
      { label: 'Smart Contract', href: '/docs/protocol/smart-contract' },
      { label: 'State Layout', href: '/docs/protocol/state-layout' },
      { label: 'Swap Verification', href: '/docs/protocol/swap-verification' },
      { label: 'Tick Crossing', href: '/docs/protocol/tick-crossing' },
      { label: 'Fee Accounting', href: '/docs/protocol/fee-accounting' },
      { label: 'Unit Scaling', href: '/docs/protocol/unit-scaling' },
    ],
  },
  {
    group: 'SDK',
    items: [
      { label: 'Overview', href: '/docs/sdk/overview' },
      { label: 'Installation', href: '/docs/sdk/installation' },
      { label: 'Reading Pool State', href: '/docs/sdk/reading-pool-state' },
      { label: 'Quoting Swaps', href: '/docs/sdk/quoting-swaps' },
      { label: 'Executing Swaps', href: '/docs/sdk/executing-swaps' },
      { label: 'Adding Liquidity', href: '/docs/sdk/adding-liquidity' },
      { label: 'Managing Positions', href: '/docs/sdk/managing-positions' },
      { label: 'API Reference', href: '/docs/sdk/api-reference' },
    ],
  },
  {
    group: 'Frontend',
    items: [
      { label: 'Overview', href: '/docs/frontend/overview' },
      { label: 'Data Hooks', href: '/docs/frontend/data-hooks' },
      { label: 'Visualizations', href: '/docs/frontend/visualizations' },
    ],
  },
  {
    group: 'Reference',
    items: [
      { label: 'Glossary', href: '/docs/reference/glossary' },
      { label: 'Constants', href: '/docs/reference/constants' },
      { label: 'Deployed Addresses', href: '/docs/reference/deployed-addresses' },
      { label: 'Paper', href: '/docs/reference/paper' },
    ],
  },
];

export default function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="docs-sidebar p-4">
      <DocSearch />

      <nav>
        {navStructure.map((section) => (
          <div key={section.group} className="docs-nav-group">
            <div className="docs-nav-title">{section.group}</div>
            {section.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`docs-nav-item ${isActive ? 'active' : ''}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
