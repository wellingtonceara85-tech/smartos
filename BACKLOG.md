# SmartOS — Backlog (pós-MVP)

Itens identificados durante a implementação do MVP que ficaram fora do escopo do Documento 03 e devem ser avaliados em versões futuras.

## Soft delete (inativação) de clientes, ordens e usuários

O MVP não realiza exclusão física de nenhum registro de negócio — decisão arquitetural registrada em `ARCHITECTURE.md` (seção 9). As regras do Firestore bloqueiam `delete` em `/clientes`, `/ordens` e `/usuarios`.

Pendência: criar mecanismo de inativação (ex.: campo `ativo: boolean`) para clientes e ordens que precisem ser removidos da operação corrente sem perder histórico. Para usuários, esse mecanismo já está sendo implementado na T12 (campo `ativo` em `usuarios/{uid}`, controlando acesso ao sistema sem excluir o documento).

## Convite de usuário por e-mail real (T12)

A T12 (Gerenciar Usuários) cria apenas o documento do usuário no Firestore ao "convidar". Não há envio de e-mail, senha temporária, Firebase Admin SDK ou Cloud Functions no MVP. Implementar o fluxo completo de convite/onboarding fica para uma versão futura.

## Endurecer a regra pública de leitura de `ordens` (T13)

A T13 introduziu o portal público SmartTrack (`/track/:token`), que precisa ler `ordens` sem autenticação. A regra adotada (ver `T13_FIRESTORE_RULES_SMARTTRACK.md`) permite `list` público com `limit(1)` porque o Firestore não valida o conteúdo do filtro `where("token","==",...)` nas regras de segurança — na prática, isso deixa a coleção `ordens` de todas as empresas enumerável por paginação, mesmo sem conhecer nenhum token.

Decisão consciente tomada para não aumentar o escopo arquitetural na última sprint do MVP (a alternativa seria uma coleção espelhada `ordens_publicas/{token}` com apenas os campos públicos, sincronizada nas escritas de OS). Uma versão futura deve revisar essa regra — a coleção espelhada é a solução mais segura e deve ser avaliada antes de uma escala maior de clientes/empresas no SmartOS.
