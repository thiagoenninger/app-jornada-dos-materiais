# Jornada dos Materiais — Casa de Metal

Sistema de maquete virtual da exposição: um tablet de seleção e quatro telas
que reproduzem, em sequência, a jornada de um material da natureza ao cotidiano.

## Arquitetura

Um mini-PC conecta-se às 4 TVs por HDMI e roda o servidor local. O tablet
conecta pela rede WiFi local e envia apenas o comando de qual material tocar.
Não depende de internet.

Fluxo relé: ao escolher um material, a Tela 1 toca inteira, depois a 2, a 3 e
a 4. Ao fim, o sistema volta sozinho ao estado inicial.

## Requisitos

- Node.js 24 LTS

## Como rodar

    npm install       # instala as dependências
    npm run build     # gera a versão final em dist/
    npm start         # sobe o servidor

Em desenvolvimento, use `npm run dev` para atualização automática do front.

## Estrutura

- `server/`   — servidor local
- `apps/`     — interfaces React (tablet e telas)
- `content/`  — materiais, vídeos e imagens (vídeos não versionados)
- `scripts/`  — utilitários
- `docs/`     — manuais de operação

## Conteúdo

Os vídeos não estão neste repositório. Ver `docs/` para o procedimento de
instalação do conteúdo.