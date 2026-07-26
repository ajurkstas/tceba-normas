# Consulta às Normas do TCE/BA

Aplicativo de página única (PWA) para consulta ao acervo normativo do TCE/BA, com a mesma regra de fidelidade documental do Projeto: resumo prático seguido da transcrição literal da norma aplicável, ou declaração expressa de ausência de regulamentação.

Publicado em: https://ajurkstas.github.io/tceba-normas/

## Arquivos

- `index.html` — aplicativo completo (interface, acervo e lógica de consulta)
- `acervo.json` — acervo normativo **publicado**: o mesmo para qualquer pessoa que acesse o link
- `manifest.json` — nome, ícone e cores para instalação como aplicativo
- `sw.js` — service worker para carregar a interface offline
- `logo-titulo.png` — imagem exibida no topo, no lugar do título escrito
- `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` — ícones do aplicativo

## Como funciona o acervo (banco de dados único)

O acervo que qualquer visitante do link enxerga na aba Consulta vem do arquivo `acervo.json`, que faz parte deste repositório. É o mesmo arquivo para todo mundo — não existe um banco de dados por trás, nem cadastro individual por visitante.

Alterações feitas na aba Acervo (Nova norma, Colagem em lote, Carregar PDF etc.) ficam salvas apenas **no navegador de quem está editando** (localStorage), como um rascunho local — a tela mostra um aviso "Rascunho local" enquanto isso. Nada disso é visível para outros visitantes automaticamente.

**Para publicar** as mudanças (isto é, atualizar o que todo mundo vê):
1. Clique em "Exportar JSON" na aba Acervo para baixar o arquivo com o acervo atualizado.
2. Peça para eu (Claude) substituir o `acervo.json` do repositório por esse conteúdo e publicar (`git commit` + `git push`).

Esse fluxo é manual e propositalmente simples — evita depender de um banco de dados externo e de autenticação para separar "quem pode editar" de "quem só consulta".

## Consulta por IA — só funciona dentro do Claude.ai (ainda)

A chamada que faz a pergunta à IA usa a API da Anthropic diretamente do navegador, sem chave de API. Isso só funciona **dentro do Claude.ai**, quando o `index.html` é aberto como artefato — o próprio Claude.ai intermedeia essa chamada.

No site publicado (GitHub Pages), essa chamada falha com erro de rede/CORS: o botão "Consultar" não vai retornar resposta nenhuma para quem acessar o link. Para a consulta por IA funcionar fora do Claude.ai, é necessário um pequeno backend próprio (por exemplo, uma função serverless) que guarde a chave de API da Anthropic e repasse a pergunta e o acervo para o modelo — isso ainda não foi implementado.

O cadastro do acervo (Acervo, Colagem em lote, Importar/Exportar JSON, Carregar PDF) não depende da IA e funciona normalmente em qualquer um dos dois cenários.

## Backup

O botão "Exportar JSON" na aba Acervo salva todo o acervo cadastrado (publicado + rascunho local) em um arquivo, que pode ser reimportado depois pelo botão "Importar JSON" — inclusive em outro navegador ou instalação.
