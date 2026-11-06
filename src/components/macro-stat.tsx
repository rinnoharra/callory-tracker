type MacroStatProps = {
  label: string;
  grams: number;
};

export function MacroStat({ label, grams }: MacroStatProps) {
  return (
    <div className="rounded-xl bg-tint px-2 py-3 text-center">
      <p className="text-lg font-medium tabular-nums">{grams} г</p>
      <p className="text-sm text-ink-muted">{label}</p>
    </div>
  );
}
