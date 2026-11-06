export const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3 py-2.5 outline-none focus:border-brand focus:ring-1 focus:ring-brand";

export const primaryButtonClass =
  "rounded-xl bg-brand px-4 py-3 text-center font-medium text-surface transition-colors hover:bg-brand-hover disabled:opacity-70";

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-over-text">{message}</p>;
}

type ChoiceProps = {
  legend: string;
  name: string;
  options: readonly { id: string; label: string }[];
  value?: string;
  error?: string;
};

export function Choice({ legend, name, options, value, error }: ChoiceProps) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm text-ink-muted">{legend}</legend>
      <div className="flex gap-2">
        {options.map((option) => (
          <label key={option.id} className="min-w-0 flex-1 cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.id}
              defaultChecked={option.id === value}
              className="peer sr-only"
            />
            <span className="block truncate rounded-xl border border-line px-1 py-2.5 text-center text-sm transition-colors peer-checked:border-brand peer-checked:bg-tint peer-checked:font-medium peer-focus-visible:ring-2 peer-focus-visible:ring-brand">
              {option.label}
            </span>
          </label>
        ))}
      </div>
      <FieldError message={error} />
    </fieldset>
  );
}
