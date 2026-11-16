import { visiblePoints, type HeadcountPoint } from "@/lib/monthly-assembly";

const WIDTH = 640;
const PLOT_H = 180;
const LABEL_H = 72;
const HEIGHT = PLOT_H + LABEL_H;
const PAD_X = 36;
const PAD_Y = 16;

function linePoints(
  points: HeadcountPoint[],
  pick: (point: HeadcountPoint) => number | null,
  max: number,
): string[][] {
  const step = points.length <= 1 ? 0 : (WIDTH - PAD_X * 2) / Math.max(points.length - 1, 1);
  const groups: string[][] = [];
  let current: string[] = [];
  points.forEach((point, index) => {
    const value = pick(point);
    if (value == null) {
      if (current.length) groups.push(current);
      current = [];
      return;
    }
    const x = PAD_X + index * step;
    const y = PAD_Y + (1 - value / max) * (PLOT_H - PAD_Y * 2);
    current.push(`${x},${y}`);
  });
  if (current.length) groups.push(current);
  return groups;
}

function Series({
  points,
  pick,
  max,
  className,
}: {
  points: HeadcountPoint[];
  pick: (point: HeadcountPoint) => number | null;
  max: number;
  className: string;
}) {
  const groups = linePoints(points, pick, max);
  return (
    <g className={className}>
      {groups.map((group, index) => (
        <polyline
          key={index}
          points={group.join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      ))}
      {groups.flat().map((pair, index) => {
        const [x, y] = pair.split(",");
        return <circle key={index} cx={x} cy={y} r="3" fill="currentColor" />;
      })}
    </g>
  );
}

export function AttendanceChart({
  title,
  points,
}: {
  title: string;
  points: HeadcountPoint[];
}) {
  const shown = visiblePoints(points);
  const values = shown.flatMap((point) => [point.dept4, point.dept13].filter((value): value is number => value != null));
  const max = Math.max(10, ...values, 0);

  return (
    <figure>
      <figcaption className="text-center text-base font-semibold">{title}</figcaption>
      {shown.length === 0 ? (
        <p className="mt-3 text-center text-sm text-muted-foreground">출석 숫자를 입력하면 그래프가 나옵니다.</p>
      ) : (
        <>
          <p className="mt-1 flex justify-center gap-6 text-xs">
            <span className="text-foreground">4부</span>
            <span className="text-accent">1–3부</span>
          </p>
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mt-2 h-64 w-full" role="img" aria-label={title}>
            <Series points={shown} pick={(point) => point.dept4} max={max} className="text-foreground" />
            <Series points={shown} pick={(point) => point.dept13} max={max} className="text-accent" />
            {shown.map((point, index) => {
              const step = shown.length <= 1 ? 0 : (WIDTH - PAD_X * 2) / Math.max(shown.length - 1, 1);
              const x = PAD_X + index * step;
              const y = PLOT_H + 8;
              return (
                <text
                  key={point.label}
                  x={x}
                  y={y}
                  textAnchor="end"
                  transform={`rotate(-45 ${x} ${y})`}
                  className="fill-current text-muted-foreground"
                  fontSize="11"
                >
                  {point.label}
                </text>
              );
            })}
          </svg>
          <table className="mt-3 w-full border-collapse text-center text-xs">
            <thead>
              <tr className="border-y border-border">
                <th className="py-1 text-left font-medium">구분</th>
                {shown.map((point) => (
                  <th key={point.label} className="py-1 font-medium">
                    {point.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <th className="py-1 text-left font-medium">4부</th>
                {shown.map((point) => (
                  <td key={`${point.label}-4`}>{point.dept4 ?? ""}</td>
                ))}
              </tr>
              <tr>
                <th className="py-1 text-left font-medium">1–3부</th>
                {shown.map((point) => (
                  <td key={`${point.label}-13`}>{point.dept13 ?? ""}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </>
      )}
    </figure>
  );
}
