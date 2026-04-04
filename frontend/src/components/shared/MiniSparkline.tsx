import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface Props {
  data: number[];
  positive: boolean;
  width?: number;
  height?: number;
}

export default function MiniSparkline({ data, positive, width = 100, height = 32 }: Props) {
  const chartData = data.map((v, i) => ({ i, v }));
  const color = positive ? 'hsl(152, 69%, 41%)' : 'hsl(0, 72%, 51%)';

  return (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id={`gradient-${positive ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#gradient-${positive ? 'up' : 'down'})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
