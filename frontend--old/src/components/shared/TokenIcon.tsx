import { Token } from '@/data/types';

export default function TokenIcon({ token, size = 32 }: { token: Token; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold shrink-0"
      style={{
        width: size,
        height: size,
        background: token.color,
        fontSize: size * 0.35,
        color: 'white',
      }}
    >
      {token.symbol.slice(0, 2)}
    </div>
  );
}
