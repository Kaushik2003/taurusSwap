import Link from 'next/link';
import { BookOpen, Sigma, Shield, Code, Monitor, FileText } from 'lucide-react';

const sections = [
  {
    title: 'Introduction',
    description: 'Learn what Orbital AMM is and why we built it on Algorand',
    href: '/docs/introduction/what-is-orbital',
    icon: BookOpen,
    color: '#FCA5F1',
  },
  {
    title: 'Math',
    description: 'Deep dive into the sphere invariant, polar decomposition, and torus geometry',
    href: '/docs/math/overview',
    icon: Sigma,
    color: '#B6F4CC',
  },
  {
    title: 'Protocol',
    description: 'Smart contract architecture, state layout, and verification logic',
    href: '/docs/protocol/architecture',
    icon: Shield,
    color: '#FFC1D9',
  },
  {
    title: 'SDK',
    description: 'TypeScript SDK for reading pool state, quoting swaps, and managing liquidity',
    href: '/docs/sdk/overview',
    icon: Code,
    color: '#C0FCFD',
  },
  {
    title: 'Frontend',
    description: 'React components, data hooks, and Three.js visualizations',
    href: '/docs/frontend/overview',
    icon: Monitor,
    color: '#FFE169',
  },
  {
    title: 'Reference',
    description: 'Glossary, constants, deployed addresses, and the original paper',
    href: '/docs/reference/glossary',
    icon: FileText,
    color: '#9FE870',
  },
];

export default function DocsPage() {
  return (
    <div className="page-slide-in">
      <h1>Taurus Swap Documentation</h1>

      <p className="text-lg leading-relaxed mb-8">
        Welcome to the technical documentation for <strong>taurusSwap</strong> — an implementation of the
        Orbital AMM from Paradigm (Dave White, Dan Robinson, Ciamac Moallemi) on Algorand.
        These docs cover the mathematical foundations, smart contract design, SDK usage, and
        frontend architecture. Whether you&apos;re a researcher, developer, or LP, you&apos;ll find
        everything needed to understand how the protocol works.
      </p>

      <div className="docs-cards-grid">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href} className="docs-card">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center border-2 border-dark-green"
                  style={{ backgroundColor: section.color }}
                >
                  <Icon className="w-5 h-5 text-dark-green" />
                </div>
                <h3 className="docs-card-title !mb-0">{section.title}</h3>
              </div>
              <p className="docs-card-description">{section.description}</p>
            </Link>
          );
        })}
      </div>

      <div className="mt-12 p-6 bg-[#FCA5F1] border-2 border-dark-green rounded-2xl shadow-[4px_4px_0_0_var(--border)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="text-xl font-black text-dark-green mb-2">
              Start Here
            </h3>
            <p className="text-dark-green/80 font-medium">
              New to Orbital AMM? Begin with the introduction to understand the core concepts.
            </p>
          </div>
          <Link
            href="/docs/introduction/what-is-orbital"
            className="px-6 py-3 bg-dark-green text-white font-black rounded-xl border-2 border-dark-green shadow-[3px_3px_0_0_#000] hover:translate-y-[1px] hover:translate-x-[-1px] hover:shadow-[1px_1px_0_0_#000] transition-all whitespace-nowrap"
          >
            Begin →
          </Link>
        </div>
      </div>

      <div className="mt-16">
        <h2 className="!mt-0">What&apos;s New</h2>
        <ul className="space-y-2 text-dark-green/80">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#6ea96a]" />
            <span>Added: Pool seeding visualization with animation</span>
            <span className="text-xs text-dark-green/50 ml-auto">April 2026</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#f2d15f]" />
            <span>Updated: Fee accounting documentation with O(1) pattern explanation</span>
            <span className="text-xs text-dark-green/50 ml-auto">April 2026</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00c4d9]" />
            <span>Added: SDK API reference with full type signatures</span>
            <span className="text-xs text-dark-green/50 ml-auto">April 2026</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
