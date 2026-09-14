import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

type Variante = 'primario' | 'secundario' | 'perigo' | 'fantasma';

const ESTILOS: Record<Variante, string> = {
  primario: 'bg-amber-700 text-white hover:bg-amber-800 disabled:bg-amber-700/50',
  secundario: 'border border-stone-300 bg-white text-slate-900 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-900 dark:text-stone-100 dark:hover:bg-slate-800',
  perigo: 'border border-rose-200 text-rose-900 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40',
  fantasma: 'text-slate-700 hover:bg-stone-200 dark:text-stone-300 dark:hover:bg-slate-800',
};

export function Botao({
  variante = 'primario',
  pequeno = false,
  className = '',
  children,
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; pequeno?: boolean }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded font-medium transition disabled:cursor-not-allowed ${
        pequeno ? 'min-h-9 px-3 text-sm' : 'min-h-11 px-4 text-base'
      } ${ESTILOS[variante]} ${className}`}
      {...resto}
    >
      {children}
    </button>
  );
}

const CAMPO = 'w-full rounded border border-stone-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700 dark:border-slate-700 dark:bg-slate-900 dark:text-stone-100';

export function Rotulo({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block font-mono text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {children}
    </label>
  );
}

export function Campo({ className = '', ...resto }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${CAMPO} ${className}`} {...resto} />;
}

export function AreaTexto({ className = '', ...resto }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${CAMPO} leading-relaxed ${className}`} {...resto} />;
}

export function Selecao({ className = '', children, ...resto }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${CAMPO} ${className}`} {...resto}>
      {children}
    </select>
  );
}

type TomAviso = 'info' | 'atencao' | 'erro' | 'sucesso';
const TONS: Record<TomAviso, string> = {
  info: 'border-slate-300 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-stone-200',
  atencao: 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
  erro: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200',
  sucesso: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
};

export function Aviso({ tom = 'info', icone, children, className = '' }: { tom?: TomAviso; icone?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-start gap-2 rounded border px-3 py-2 text-sm ${TONS[tom]} ${className}`} role={tom === 'erro' ? 'alert' : undefined}>
      {icone && <span className="mt-0.5 shrink-0">{icone}</span>}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Cartao({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded border border-stone-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 ${className}`}>
      {children}
    </div>
  );
}

export function Titulo({ children, icone }: { children: ReactNode; icone?: ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-stone-100">
      {icone}
      {children}
    </h2>
  );
}
