export default function ScoreRing({ percent, size = 140 }) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  const color = percent >= 80 ? "#16a34a" : percent >= 50 ? "#d97706" : "#dc2626";
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.1em" fontSize="28" fontWeight="700" fill="#0f172a">
        {percent}%
      </text>
      <text x="50%" y="50%" textAnchor="middle" dy="1.6em" fontSize="11" fill="#64748b">
        соответствие
      </text>
    </svg>
  );
}
