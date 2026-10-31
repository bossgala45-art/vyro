import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react';

export interface ChartPoint {
  date: string;
  value: number;
}

interface LineChartProps {
  /** Nom de la série, repris dans la description accessible. */
  label: string;
  points: readonly ChartPoint[];
  formatValue: (value: number) => string;
  formatDate: (date: string) => string;
}

const WIDTH = 320;
const HEIGHT = 168;
const PAD = { top: 16, right: 12, bottom: 24, left: 40 };
const TIME = (date: string) => new Date(`${date}T12:00:00`).getTime();

/**
 * Courbe d'une série mesurée. Seuls les points réellement saisis sont tracés (aucune
 * interpolation au-delà du trait qui les relie). Toucher le graphique affiche la valeur
 * la plus proche ; les flèches du clavier passent d'un point à l'autre ; un tableau
 * donne toutes les valeurs.
 */
export function LineChart({ label, points, formatValue, formatDate }: LineChartProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const tableId = useId();
  if (points.length === 0) return <p className="text-sm text-mist">Aucune mesure sur cette période.</p>;

  const times = points.map((point) => TIME(point.date));
  const values = points.map((point) => point.value);
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = rawMax - rawMin || Math.max(1, Math.abs(rawMax) * 0.05);
  const minV = rawMin - span * 0.15;
  const maxV = rawMax + span * 0.15;
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (time: number) => PAD.left + (maxT === minT ? innerW / 2 : ((time - minT) / (maxT - minT)) * innerW);
  const y = (value: number) => PAD.top + (1 - (value - minV) / (maxV - minV)) * innerH;
  const coords = points.map((point, index) => ({ x: x(times[index] ?? 0), y: y(point.value) }));
  const path = coords.map((c, index) => `${index === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const ticks = [rawMin, (rawMin + rawMax) / 2, rawMax].filter((value, index, all) => all.indexOf(value) === index);
  const active = selected === null ? points.length - 1 : Math.min(selected, points.length - 1);
  const activePoint = points[active];
  const activeCoord = coords[active];
  const first = points[0];
  const last = points[points.length - 1];

  const pick = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width === 0) return;
    const px = ((event.clientX - box.left) / box.width) * WIDTH;
    let nearest = 0;
    coords.forEach((c, index) => {
      if (Math.abs(c.x - px) < Math.abs((coords[nearest]?.x ?? 0) - px)) nearest = index;
    });
    setSelected(nearest);
  };
  const onKey = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key === 'ArrowLeft') setSelected(Math.max(0, active - 1));
    else if (event.key === 'ArrowRight') setSelected(Math.min(points.length - 1, active + 1));
    else return;
    event.preventDefault();
  };

  return (
    <div>
      {activePoint && (
        <p className="text-sm text-mist" aria-live="polite">
          <span className="font-display text-2xl font-semibold text-snow">{formatValue(activePoint.value)}</span>{' '}
          {formatDate(activePoint.date)}
        </p>
      )}
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-1 w-full touch-pan-y select-none focus-visible:outline-2 focus-visible:outline-volt-400"
        role="img"
        tabIndex={0}
        aria-label={`${label} : ${points.length} mesure${points.length > 1 ? 's' : ''}${
          first && last && points.length > 1
            ? `, de ${formatValue(first.value)} (${formatDate(first.date)}) à ${formatValue(last.value)} (${formatDate(last.date)}). Flèches gauche et droite pour parcourir les points.`
            : first
              ? `, ${formatValue(first.value)} (${formatDate(first.date)}).`
              : ''
        }`}
        aria-describedby={tableId}
        onPointerDown={pick}
        onPointerMove={(event) => event.buttons > 0 || event.pointerType === 'mouse' ? pick(event) : undefined}
        onKeyDown={onKey}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} className="stroke-ink-700" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(tick)} textAnchor="end" dominantBaseline="middle" className="fill-mist text-[10px]">
              {tick.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
            </text>
          </g>
        ))}
        {first && last && (
          <>
            <text x={PAD.left} y={HEIGHT - 6} className="fill-mist text-[10px]">
              {formatDate(first.date)}
            </text>
            {points.length > 1 && (
              <text x={WIDTH - PAD.right} y={HEIGHT - 6} textAnchor="end" className="fill-mist text-[10px]">
                {formatDate(last.date)}
              </text>
            )}
          </>
        )}
        {activeCoord && <line x1={activeCoord.x} x2={activeCoord.x} y1={PAD.top} y2={HEIGHT - PAD.bottom} className="stroke-mist/40" strokeWidth={1} />}
        {points.length > 1 && <path d={path} fill="none" className="stroke-volt-500" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
        {coords.map((c, index) => (
          <circle
            key={points[index]?.date}
            cx={c.x}
            cy={c.y}
            r={index === active ? 5.5 : 4}
            className={index === active ? 'fill-volt-400 stroke-ink-900' : 'fill-volt-500 stroke-ink-900'}
            strokeWidth={2}
          />
        ))}
      </svg>
      <details className="mt-1">
        <summary className="min-h-11 cursor-pointer list-none py-2 text-sm font-medium text-volt-400">Voir les valeurs</summary>
        <table id={tableId} className="w-full text-sm">
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr className="text-left text-xs text-mist">
              <th className="py-1 font-medium">Date</th>
              <th className="py-1 text-right font-medium">Mesure</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-700/60">
            {[...points].reverse().map((point) => (
              <tr key={point.date}>
                <td className="py-1 text-mist">{formatDate(point.date)}</td>
                <td className="py-1 text-right text-snow">{formatValue(point.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
