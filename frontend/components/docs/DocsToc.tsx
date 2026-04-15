'use client';

import { useEffect, useState } from 'react';

interface TocItem {
  id: string;
  text: string;
  depth: number;
}

export default function DocsToc() {
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const headings = Array.from(
      document.querySelectorAll('h2, h3')
    ).filter((el) => el.id);

    const items: TocItem[] = headings.map((heading) => ({
      id: heading.id,
      text: heading.textContent || '',
      depth: heading.tagName === 'H2' ? 2 : 3,
    }));

    setToc(items);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0% -35% 0%' }
    );

    headings.forEach((heading) => observer.observe(heading));

    return () => observer.disconnect();
  }, []);

  if (toc.length === 0) return null;

  return (
    <aside className="docs-toc p-4">
      <nav>
        <div className="text-xs font-bold uppercase tracking-wider opacity-60 mb-3">
          On this page
        </div>
        {toc.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`toc-item toc-item-depth-${item.depth} ${
              activeId === item.id ? 'active' : ''
            }`}
          >
            {item.text}
          </a>
        ))}
      </nav>

      <div className="mt-6 pt-4 border-t border-border/40">
        <a
          href="https://github.com/Kaushik2003/taurusSwap"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-dark-green/70 hover:text-dark-green hover:underline"
        >
          Edit this page →
        </a>
      </div>
    </aside>
  );
}
