# T13 — Regra de Firestore para o Portal Público SmartTrack

A T13 introduz a rota pública `/track/:token`, que precisa ler a coleção `ordens`
e o documento da empresa correspondente **sem autenticação**. As regras atuais
(descritas em `ARCHITECTURE.md`, seção 6) exigem que o `empresaId` do usuário
autenticado bata com o do documento — isso bloqueia totalmente a leitura pública.

## O que muda

Adicione as regras abaixo às já existentes para `ordens` e `empresas` (mantendo
todas as regras de escrita e de leitura autenticada como estão hoje — isto é
**aditivo**, não substitui nada):

```
match /ordens/{ordemId} {
  // ... regras existentes de leitura/escrita autenticada permanecem iguais ...

  // Leitura pública para o portal SmartTrack: a consulta usa where("token","==", token)
  // com limit(1). As regras do Firestore não conseguem validar o conteúdo do filtro
  // (apenas request.query.limit), então tecnicamente esta regra permite "list" público
  // na coleção inteira se alguém manipular a query sem o filtro de token.
  allow list: if request.query.limit <= 1;
  allow get: if true;
}

match /empresas/{empresaId} {
  // ... regra existente de leitura autenticada permanece igual ...

  // Leitura pública: necessária para exibir nome/logo/telefone/garantia no portal.
  allow get: if true;
}
```

## Risco residual (aceito conscientemente)

Como reportado durante o planejamento desta sprint, o Firestore **não oferece
um jeito nativo de restringir uma `list` ao filtro `where("token","==",X)`** —
a regra só enxerga `limit`, não o conteúdo do filtro. Isso significa que, em
teoria, alguém com conhecimento técnico poderia paginar `ordens` com
`limit(1)` + cursores e eventualmente ler todos os documentos da coleção
(de todas as empresas), mesmo sem saber nenhum token.

Esta abordagem foi explicitamente escolhida em vez da alternativa mais segura
(coleção espelhada `ordens_publicas/{token}` com apenas os campos permitidos),
porque essa alternativa exigiria nova coleção, nova lógica de sincronização e
mais escopo arquitetural na última sprint do MVP. Fica registrado aqui como
pendência conhecida para uma revisão de segurança pós-MVP — ver sugestão que
vou registrar no `BACKLOG.md`.

## Como aplicar

Copie o bloco acima e cole manualmente no Console do Firebase
(Firestore Database → Regras), dentro da seção correspondente das coleções
`ordens` e `empresas`, sem remover nenhuma regra existente. Não há Firebase
CLI configurado neste projeto (consistente com a nota em `ARCHITECTURE.md`).
