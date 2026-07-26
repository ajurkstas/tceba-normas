# Consulta às Normas do TCE/BA

Aplicativo de página única (PWA) para consulta ao acervo normativo do TCE/BA, com a mesma regra de fidelidade documental do Projeto: resumo prático seguido da transcrição literal da norma aplicável, ou declaração expressa de ausência de regulamentação.

## Arquivos

- `index.html` — aplicativo completo (interface, acervo e lógica de consulta)
- `manifest.json` — nome, ícone e cores para instalação como aplicativo
- `sw.js` — service worker para carregar a interface offline
- `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` — ícones do aplicativo

## Duas formas de uso

**1. Dentro do Claude.ai (imediato, sem instalação)**
Abrir o arquivo `index.html` como artefato no Claude é suficiente para usar o acervo e a consulta por IA. Neste modo, a chamada à IA funciona automaticamente, sem qualquer chave de API, porque o Claude.ai intermedeia a requisição. O acervo cadastrado fica salvo entre sessões através do armazenamento próprio de artefatos do Claude.

**2. Hospedado em servidor próprio (instalável, com ícone na tela inicial)**
Para instalar como aplicativo (ícone no celular ou no computador, funcionamento offline da interface), hospede os cinco arquivos juntos em qualquer servidor estático com HTTPS (por exemplo GitHub Pages, Netlify, Vercel ou Cloudflare Pages). Neste cenário, a instalação funciona normalmente, mas **a consulta por IA deixa de funcionar sem configuração adicional**: fora do Claude.ai não há intermediação automática da chamada à API da Anthropic, e uma chave de API não pode ser exposta com segurança direto no navegador. Para manter a consulta por IA funcionando fora do Claude.ai, é necessário um pequeno backend próprio (uma função serverless, por exemplo) que guarde a chave de API e repasse a pergunta e o acervo para o modelo — posso montar esse backend à parte, se for do interesse.

Em ambos os casos, o cadastro do acervo (Acervo, Colagem em lote, Importar/Exportar JSON) funciona sem depender da IA.

## Backup

O botão "Exportar JSON" na aba Acervo salva todo o acervo cadastrado em um arquivo, que pode ser reimportado depois (inclusive em outra instalação do aplicativo) pelo botão "Importar JSON".
