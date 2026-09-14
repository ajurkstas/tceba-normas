import { BookOpenIcon, Cog6ToothIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export type Aba = 'consulta' | 'acervo' | 'ajustes';

const ABAS: { id: Aba; rotulo: string; Icone: typeof BookOpenIcon }[] = [
  { id: 'consulta', rotulo: 'Consulta', Icone: MagnifyingGlassIcon },
  { id: 'acervo', rotulo: 'Acervo', Icone: BookOpenIcon },
  { id: 'ajustes', rotulo: 'Ajustes', Icone: Cog6ToothIcon },
];

export function BarraAbas({ ativa, aoMudar }: { ativa: Aba; aoMudar: (a: Aba) => void }) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-300 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-700 dark:bg-slate-900"
    >
      <ul className="mx-auto flex max-w-3xl">
        {ABAS.map(({ id, rotulo, Icone }) => {
          const atual = id === ativa;
          return (
            <li key={id} className="flex-1">
              <button
                type="button"
                aria-current={atual ? 'page' : undefined}
                onClick={() => aoMudar(id)}
                className={`flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                  atual ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icone className="h-6 w-6" />
                {rotulo}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
