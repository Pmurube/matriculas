import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from 'react';

/** Input separado de la matrícula. Mantiene el foco para que el teclado móvil no se cierre. */
export function AnswerForm({ onSubmit, onPass, disabled, resetKey }: { onSubmit: (w: string) => void; onPass: () => void; disabled: boolean; resetKey: number }) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled]);
  useEffect(() => {
    setValue('');
  }, [resetKey]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value);
    ref.current?.focus();
  };
  const keep = (e: PointerEvent) => e.preventDefault();
  return (
    <form onSubmit={submit} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_auto_auto] sm:gap-3" aria-label="Responder">
      <label htmlFor="answer" className="sr-only">Tu palabra</label>
      <input
        id="answer"
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        maxLength={30}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck={false}
        enterKeyHint="go"
        inputMode="text"
        placeholder="Escribe tu palabra"
        data-testid="answer"
        className="col-span-2 min-h-14 w-full rounded-xl border-2 border-road/70 bg-white px-4 text-2xl font-bold uppercase tracking-wide placeholder:text-base placeholder:font-medium placeholder:normal-case placeholder:tracking-normal placeholder:text-muted/70 focus:border-road focus:outline-none sm:col-span-1"
      />
      <button type="submit" className="btn-primary" disabled={disabled} onPointerDown={keep} data-testid="validate">Validar</button>
      <button type="button" className="btn-secondary" disabled={disabled} onPointerDown={keep} onClick={() => { onPass(); setValue(''); ref.current?.focus(); }} data-testid="pass">Pasar</button>
    </form>
  );
}
