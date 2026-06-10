export function CreditDonut({ used, total }: { used: number; total: number }) {
  const size = 32
  const stroke = 4
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = total > 0 ? Math.min(1, used / total) : 0
  const offset = circumference * (1 - pct)
  const color = pct >= 1 ? 'hsl(var(--destructive))' : pct >= 0.8 ? '#f59e0b' : 'hsl(var(--primary))'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  )
}
