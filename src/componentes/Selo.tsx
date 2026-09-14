import { CheckCircleIcon, ExclamationTriangleIcon, PencilIcon, XCircleIcon } from '@heroicons/react/20/solid';
import type { Situacao } from '../dominio/tipos';
import { rotuloSituacao } from '../dominio/hierarquia';
import type { TomVigencia } from '../dominio/parserResposta';

const CLASSES: Record<TomVigencia | 'rascunho', string> = {
  vigor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  atencao: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  revogada: 'bg-rose-100 text-rose-900 dark:bg-rose-950/40 dark:text-rose-300',
  neutro: 'bg-stone-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  rascunho: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
};

const ICONES = {
  vigor: CheckCircleIcon,
  atencao: ExclamationTriangleIcon,
  revogada: XCircleIcon,
  neutro: null,
  rascunho: PencilIcon,
};

export function Selo({ tom, children }: { tom: TomVigencia | 'rascunho'; children: React.ReactNode }) {
  const Icone = ICONES[tom];
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs uppercase tracking-wide ${CLASSES[tom]}`}>
      {Icone && <Icone className="h-4 w-4" />}
      {children}
    </span>
  );
}

export function SeloSituacao({ status }: { status: Situacao }) {
  const tom: TomVigencia = status === 'revogada' ? 'revogada' : status === 'vigente_alteracoes' ? 'atencao' : 'vigor';
  return <Selo tom={tom}>{rotuloSituacao(status)}</Selo>;
}
