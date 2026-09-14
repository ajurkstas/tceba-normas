export const TIPOS_ATO = [
  'Constituição Federal',
  'Constituição do Estado',
  'Lei Orgânica',
  'Regimento Interno',
  'Resolução Normativa',
  'Instrução Normativa',
  'Portaria Normativa',
  'Súmula',
  'Legislação Correlata',
] as const;

export type TipoAto = (typeof TIPOS_ATO)[number];

export type Situacao = 'vigente' | 'vigente_alteracoes' | 'revogada';

export interface Norma {
  id: string;
  tipo: TipoAto;
  numero: string;
  data: string;
  status: Situacao;
  ementa: string;
  obs: string;
  link: string;
  texto: string;
}

export interface NormaCitada {
  fonte: string;
  vigencia?: string;
  texto: string;
}

export type Resposta =
  | { formato: 'sem_norma'; frase: string }
  | {
      formato: 'com_norma';
      sintese: string;
      normas: NormaCitada[];
      observacao?: string;
      opiniao?: string;
    }
  | { formato: 'invalido'; bruto: string };

export interface ItemHistorico {
  pergunta: string;
  resposta: string;
  modelo: string;
  quando: string;
}

export const MODELOS = [
  { id: 'claude-opus-5', rotulo: 'Claude Opus 5 (padrão, mais preciso)' },
  { id: 'claude-sonnet-5', rotulo: 'Claude Sonnet 5 (mais rápido)' },
  { id: 'claude-haiku-4-5', rotulo: 'Claude Haiku 4.5 (somente testes)' },
] as const;

export type ModeloId = (typeof MODELOS)[number]['id'];
export const MODELO_PADRAO: ModeloId = 'claude-opus-5';

export type Tema = 'sistema' | 'claro' | 'escuro';

export type TamanhoFonte = 'pequeno' | 'normal' | 'grande';

export interface Ajustes {
  modelo: ModeloId;
  tema: Tema;
  tamanhoFonte: TamanhoFonte;
}

// Tema claro por padrão; o usuário pode escolher seguir o sistema ou escuro em Ajustes.
export const AJUSTES_PADRAO: Ajustes = { modelo: MODELO_PADRAO, tema: 'claro', tamanhoFonte: 'normal' };

// Um turno da conversa em uma sessão de consulta (contexto entre perguntas de acompanhamento).
export interface TurnoConversa {
  pergunta: string;
  resposta: string; // texto bruto do modelo, no formato dos marcadores
}

// Uso de tokens de uma consulta à IA, para registro local (nunca remoto).
export interface UsoTokens {
  quando: string; // ISO
  modelo: string;
  entrada: number;
  saida: number;
  cacheLeitura: number;
  cacheEscrita: number;
}
