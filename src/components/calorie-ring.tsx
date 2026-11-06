type CalorieRingProps = {
  eaten: number;
  goal: number;
};

export function CalorieRing({ eaten, goal }: CalorieRingProps) {
  const left = goal - eaten;
  const isOver = left < 0;
  const percent = Math.min((eaten / goal) * 100, 100);

  return (
    <div className="relative mx-auto size-52">
      <svg viewBox="0 0 128 128" className="size-full -rotate-90" aria-hidden>
        <circle
          cx="64"
          cy="64"
          r="56"
          fill="none"
          strokeWidth="11"
          className="stroke-tint"
        />
        {eaten > 0 && (
          <circle
            cx="64"
            cy="64"
            r="56"
            fill="none"
            strokeWidth="11"
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray={`${percent} 100`}
            className={isOver ? "stroke-over" : "stroke-accent"}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-medium tabular-nums">
          {Math.abs(left).toLocaleString("ru-RU")}
        </span>
        <span className="text-sm text-ink-muted">
          {isOver ? "ккал сверх нормы" : "ккал осталось"}
        </span>
      </div>
    </div>
  );
}
