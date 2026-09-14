// Pilha de manipuladores do botão voltar do Android (e da tecla Escape na web).
// Quem abre uma tela sobreposta (modal, visualizador) registra um fechamento aqui.
const pilha: (() => void)[] = [];

export function registrarVoltar(fechar: () => void): () => void {
  pilha.push(fechar);
  return () => {
    const i = pilha.lastIndexOf(fechar);
    if (i >= 0) pilha.splice(i, 1);
  };
}

// Executa o manipulador do topo. Retorna false se não havia nenhum.
export function executarVoltar(): boolean {
  const topo = pilha[pilha.length - 1];
  if (!topo) return false;
  topo();
  return true;
}
