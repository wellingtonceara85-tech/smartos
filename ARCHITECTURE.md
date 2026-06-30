# SmartOS — Arquitetura

Documento técnico da arquitetura do SmartOS, plataforma SaaS White Label de gestão empresarial. Cobre o modelo multiempresa (multi-tenant), autenticação, autorização, regras de segurança e convenções do projeto. Última revisão: Etapa 0 — Revisão da Arquitetura Multiempresa.

## 1. Stack

- React 19 + Vite + TypeScript (`verbatimModuleSyntax: true` — imports de tipo usam `import type`)
- TailwindCSS v4 (config via `@theme` em CSS, sem `tailwind.config.js`)
- React Router v6 (`BrowserRouter`, guards `PrivateRoute` / `PublicOnlyRoute`)
- Firebase: Authentication (e-mail/senha), Firestore, Storage (plano Blaze)

## 2. Modelo Multiempresa (Multi-Tenant)

Decisão herdada do PRD (Documento 01): **banco de dados compartilhado com discriminador por tenant**, não bancos/coleções separadas por cliente.

> "O SmartOS utilizará estratégia de banco de dados compartilhado com discriminador por tenant. Todas as tabelas de negócio possuem obrigatoriamente a coluna tenant_id indexada. Não há bancos separados por cliente."

No SmartOS esse "tenant_id" é o campo **`empresaId`**, presente em todo documento de negócio (`clientes`, `ordens`, `contadores`). Não existem subcoleções por empresa nem bancos isolados — o isolamento é garantido por:

1. Toda query de leitura inclui `where("empresaId", "==", empresaId)`.
2. Toda escrita grava `empresaId` no momento da criação.
3. Regras de segurança do Firestore validam, no servidor, que `empresaId` do documento corresponde ao `empresaId` do usuário autenticado — isolamento que não depende do cliente se comportar corretamente.
4. Leituras por ID direto (ex.: tela de detalhes da OS) são igualmente protegidas pelas regras, e o componente faz uma verificação extra no cliente (defesa em profundidade) comparando `ordem.empresaId` com o `empresaId` da sessão antes de exibir os dados.

### Numeração de OS por empresa

Requisito do PRD: "Número único e sequencial por empresa (não global)". Implementado com um contador por empresa em `contadores/{empresaId}` (campo `ultimoNumero`), incrementado via `runTransaction` em [`src/lib/nextOsNumero.ts`](src/lib/nextOsNumero.ts). Cada empresa tem sua própria sequência começando em 1.

### Storage isolado por empresa

Caminho dos arquivos: `empresas/{empresaId}/ordens/{osId}/{arquivo}.jpg` (ver [`src/components/os/PhotosBlock.tsx`](src/components/os/PhotosBlock.tsx)). As regras do Storage validam o segmento `{empresaId}` do caminho contra o `empresaId` do usuário autenticado (consulta cross-service ao Firestore).

## 3. Estrutura das coleções do Firestore

```
usuarios/{uid}
  email: string
  role: "admin" | "analista"
  empresaId: string

empresas/{empresaId}
  nome: string
  criadoEm: timestamp

clientes/{clienteId}
  empresaId: string
  nome: string
  telefone: string
  email?: string
  cpfCnpj?: string

ordens/{ordemId}
  empresaId: string
  numero: number          // sequencial por empresa
  token: string           // usado no link público SmartTrack
  clienteId, clienteNome, clienteTelefone
  equipamentoTipo, equipamentoMarca, equipamentoModelo, equipamentoNumeroSerie?, equipamentoCor?
  defeitoRelatado, diagnostico?, observacoesInternas?
  status: OsStatus
  motivoCancelamento?
  dataAbertura, prazoPrevisto?, dataConclusao?
  pagamento? { valor, formaPagamento, data }
  valorOrcamento?
  fotos? [{ url, path }]
  historico? [{ tipo, texto, autor, criadoEm, statusNovo? }]
  updatedAt

contadores/{empresaId}
  ultimoNumero: number
```

`{empresaId}` é uma chave de negócio legível (ex.: `fk-assistencia-tecnica`), não um ID gerado automaticamente — facilita auditoria e leitura direta das regras/dados no Console.

## 4. Autenticação

Firebase Authentication com e-mail/senha (`src/contexts/AuthContext.tsx`). O `AuthContext` expõe apenas `user`/`loading`; não carrega dados de negócio.

## 5. Autorização e RBAC

`src/contexts/EmpresaContext.tsx` é a única fonte de `empresaId` e `role` no app. Lê uma vez por sessão o documento `usuarios/{uid}` e expõe `{ empresaId, role, loading }` via `useEmpresa()`.

**Comportamento seguro por padrão:** se o documento `usuarios/{uid}` não existir ou não tiver `empresaId` válido, o contexto retorna `empresaId: null, role: null` — nenhum acesso implícito a dados de negócio. Páginas que dependem de `empresaId` checam esse estado e exibem uma mensagem de "conta não vinculada a uma empresa" em vez de consultar coleções com `empresaId` indefinido.

Papéis (`admin` | `analista`) controlam permissões por status de OS através da matriz `getOsPermissions(status, role)` em [`src/lib/osFlow.ts`](src/lib/osFlow.ts). `role: null` recebe a matriz mais restritiva (nenhuma permissão), nunca o conjunto de admin.

## 6. Regras de Segurança do Firestore

Substituem a regra inicial aberta (`allow read, write: if request.time < ...`), válida apenas durante o desenvolvimento inicial. Resumo do modelo:

- `usuarios/{uid}`: leitura restrita ao próprio usuário; escrita bloqueada no cliente (provisionamento de usuários é administrativo, feito fora do app nesta fase).
- `empresas/{empresaId}`: leitura restrita a quem pertence à empresa; escrita bloqueada no cliente.
- `clientes/{id}` e `ordens/{id}`: leitura/escrita exigem que `empresaId` do documento (ou do payload, em criações) corresponda ao `empresaId` do usuário autenticado; updates não podem alterar `empresaId` do documento (impede "mover" um registro entre empresas).
- `contadores/{empresaId}`: leitura/escrita restritas à própria empresa.

Texto completo das regras: ver seção de entrega desta revisão (arquivo `firestore.rules` fornecido ao usuário para colar no Console — o projeto não tem Firebase CLI/deploy configurado nesta fase).

## 7. Regras de Segurança do Storage

Caminho `empresas/{empresaId}/ordens/{osId}/{arquivo}` — leitura/escrita exigem que o `empresaId` do caminho corresponda ao `empresaId` do usuário autenticado (consulta ao Firestore via `firestore.get()` dentro das regras do Storage).

## 8. Convenções do projeto

- Campos e nomes de coleções em português, alinhados ao domínio (assistência técnica).
- Tipos TypeScript em `src/types/`, um arquivo por entidade (`cliente.ts`, `ordemServico.ts`, `empresa.ts`).
- Campos opcionais nunca são gravados como `undefined` no Firestore (rejeitado pelo SDK) — usar spread condicional: `...(valor ? { campo: valor } : {})`.
- Context React por preocupação (`AuthContext` para sessão, `EmpresaContext` para tenant/role) — evita refazer a mesma leitura do Firestore em cada página.
- Um componente, uma funcionalidade: nenhuma tela ou fluxo é implementado fora do escopo definido no Doc03 (MVP Scope & Functional Spec) sem autorização explícita.

## 9. Exclusão de registros (soft delete)

Decisão arquitetural: o SmartOS **não realiza exclusão física** de clientes, ordens de serviço ou usuários. As regras de segurança do Firestore mantêm `allow delete: if false;` em `/clientes/{clienteId}`, `/ordens/{ordemId}` e `/usuarios/{userId}` propositalmente — não é uma pendência, é a política do produto.

O MVP não implementa nenhum mecanismo de inativação ainda (nem botão de excluir, nem campo `ativo`/`inativo` em clientes ou ordens). Uma versão futura deve introduzir soft delete (ex.: campo `ativo: boolean` ou `status: "ativo" | "inativo"`) para os registros que precisarem ser removidos da operação do dia a dia sem perda de histórico. Ver item correspondente no `BACKLOG.md`.

## 10. Decisões arquiteturais desta revisão (Etapa 0)

- Substituído `useUserRole` (hook com *default* inseguro: usuário sem `usuarios/{uid}` herdava `role: "admin"`) por `EmpresaContext`, com *default* seguro (`empresaId: null, role: null`).
- Adicionado `empresaId` a todas as entidades de negócio e a todas as queries (`Dashboard`, `OrdensList`, `NovaOS`).
- Numeração de OS migrada de contador global (`contadores/ordens`) para contador por empresa (`contadores/{empresaId}`), conforme PRD.
- Caminhos de Storage migrados de `ordens/{osId}/...` para `empresas/{empresaId}/ordens/{osId}/...`.
- Nenhuma tela, fluxo ou funcionalidade nova foi adicionada nesta revisão — apenas o modelo de dados, os contextos de autorização e as regras de segurança foram fortalecidos.
