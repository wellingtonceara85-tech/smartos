import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { addDoc, collection, getDocs, query, serverTimestamp, Timestamp, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { AppShell } from "../components/layout/AppShell";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { useEmpresa } from "../contexts/EmpresaContext";
import { maskCurrencyInput, maskPhone } from "../lib/masks";
import { EQUIPMENT_TYPES } from "../lib/equipmentTypes";
import { getNextOsNumero } from "../lib/nextOsNumero";
import { generateSmartTrackToken } from "../lib/smartTrackToken";
import type { Cliente } from "../types/cliente";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormErrors {
  cliente?: string;
  novoNome?: string;
  novoTelefone?: string;
  novoEmail?: string;
  equipamentoTipo?: string;
  marca?: string;
  modelo?: string;
  defeitoRelatado?: string;
  prazoPrevisto?: string;
  valorOrcamento?: string;
}

export function NovaOS() {
  const navigate = useNavigate();
  const location = useLocation();
  const { empresaId, tiposEquipamento } = useEmpresa();
  const equipmentList = tiposEquipamento.length > 0 ? tiposEquipamento : EQUIPMENT_TYPES;

  const preselectedClienteId = (location.state as { clienteId?: string; clienteNome?: string } | null)?.clienteId;

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteQuery, setClienteQuery] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [creatingCliente, setCreatingCliente] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novoCpfCnpj, setNovoCpfCnpj] = useState("");

  const [equipamentoTipo, setEquipamentoTipo] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [cor, setCor] = useState("");

  const [defeitoRelatado, setDefeitoRelatado] = useState("");
  const [prazoPrevisto, setPrazoPrevisto] = useState("");
  const [valorDisplay, setValorDisplay] = useState("");
  const [valorCents, setValorCents] = useState(0);
  const [observacoesInternas, setObservacoesInternas] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!empresaId) return;
    getDocs(query(collection(db, "clientes"), where("empresaId", "==", empresaId)))
      .then((snapshot) => {
        const list = snapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...(docSnapshot.data() as Omit<Cliente, "id">),
        }));
        setClientes(list);
        if (preselectedClienteId) {
          const found = list.find((c) => c.id === preselectedClienteId);
          if (found) {
            setSelectedCliente(found);
            setClienteQuery(found.nome);
          }
        }
      })
      .catch(() => setFormError("Não foi possível carregar a lista de clientes. Tente recarregar a página."));
  }, [empresaId, preselectedClienteId]);

  const clienteResults = useMemo(() => {
    const term = clienteQuery.trim().toLowerCase();
    if (term.length < 2) return [];
    return clientes
      .filter(
        (cliente) =>
          (cliente.nome ?? "").toLowerCase().includes(term) ||
          (cliente.telefone ?? "").includes(term),
      )
      .slice(0, 5);
  }, [clientes, clienteQuery]);

  function resetClienteSelection() {
    setSelectedCliente(null);
    setCreatingCliente(false);
    setClienteQuery("");
    setNovoNome("");
    setNovoTelefone("");
    setNovoEmail("");
    setNovoCpfCnpj("");
  }

  function startCreatingCliente() {
    setCreatingCliente(true);
    setNovoNome(clienteQuery);
  }

  function validate(): FormErrors {
    const next: FormErrors = {};

    if (!selectedCliente && !creatingCliente) {
      next.cliente = "Selecione um cliente ou crie um novo para continuar.";
    }
    if (creatingCliente) {
      if (!novoNome) next.novoNome = "Preencha o nome do cliente para continuar.";
      const phoneDigits = novoTelefone.replace(/\D/g, "");
      if (phoneDigits.length < 10) next.novoTelefone = "Informe um telefone válido com DDD.";
      if (novoEmail && !EMAIL_REGEX.test(novoEmail)) {
        next.novoEmail = "Formato de e-mail inválido.";
      }
    }

    if (!equipamentoTipo) next.equipamentoTipo = "Selecione o tipo de equipamento.";
    if (!marca) next.marca = "Preencha a marca do equipamento.";
    if (!modelo) next.modelo = "Preencha o modelo do equipamento.";
    if (!defeitoRelatado) next.defeitoRelatado = "Descreva o defeito relatado pelo cliente.";

    if (prazoPrevisto) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(prazoPrevisto) < today) {
        next.prazoPrevisto = "O prazo previsto deve ser hoje ou uma data futura.";
      }
    }

    if (valorCents > 0 && valorCents < 1) {
      next.valorOrcamento = "O valor deve ser maior que zero.";
    }

    return next;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError("");

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    if (!empresaId) {
      setFormError("Sua conta ainda não está vinculada a uma empresa.");
      return;
    }

    setSaving(true);
    try {
      let clienteId: string;
      let clienteNome: string;
      let clienteTelefone: string;

      if (creatingCliente) {
        const clienteDoc = await addDoc(collection(db, "clientes"), {
          empresaId,
          nome: novoNome,
          telefone: novoTelefone,
          ...(novoEmail ? { email: novoEmail } : {}),
          ...(novoCpfCnpj ? { cpfCnpj: novoCpfCnpj } : {}),
        });
        clienteId = clienteDoc.id;
        clienteNome = novoNome;
        clienteTelefone = novoTelefone;
      } else {
        clienteId = selectedCliente!.id;
        clienteNome = selectedCliente!.nome;
        clienteTelefone = selectedCliente!.telefone;
      }

      const numero = await getNextOsNumero(empresaId);
      const token = generateSmartTrackToken();

      await addDoc(collection(db, "ordens"), {
        empresaId,
        numero,
        token,
        clienteId,
        clienteNome,
        clienteTelefone,
        equipamentoTipo,
        equipamentoMarca: marca,
        equipamentoModelo: modelo,
        ...(numeroSerie ? { equipamentoNumeroSerie: numeroSerie } : {}),
        ...(cor ? { equipamentoCor: cor } : {}),
        defeitoRelatado,
        ...(observacoesInternas ? { observacoesInternas } : {}),
        status: "Aguardando Avaliação",
        dataAbertura: serverTimestamp(),
        ...(prazoPrevisto
          ? { prazoPrevisto: Timestamp.fromDate(new Date(prazoPrevisto)) }
          : {}),
        ...(valorCents > 0 ? { valorOrcamento: valorCents / 100 } : {}),
        updatedAt: serverTimestamp(),
      });

      navigate("/ordens", { state: { successMessage: "OS criada com sucesso." } });
    } catch {
      setFormError("Não foi possível salvar. Verifique sua conexão.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Nova Ordem de Serviço">
      <form className="max-w-2xl space-y-8" onSubmit={handleSubmit} noValidate>
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Cliente
          </h2>

          {selectedCliente ? (
            <div className="flex items-center justify-between rounded-lg border border-slate-200/70 bg-white px-4 py-3 shadow-sm">
              <div>
                <p className="text-sm font-medium text-slate-900">{selectedCliente.nome}</p>
                <p className="text-xs text-slate-500">{selectedCliente.telefone}</p>
              </div>
              <Button type="button" variant="ghost" onClick={resetClienteSelection} disabled={saving}>
                Trocar cliente
              </Button>
            </div>
          ) : creatingCliente ? (
            <div className="space-y-4 rounded-lg border border-slate-200/70 bg-white p-4 shadow-sm">
              <Input
                id="novo-nome"
                label="Nome"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                error={errors.novoNome}
                disabled={saving}
              />
              <Input
                id="novo-telefone"
                label="Telefone"
                value={novoTelefone}
                onChange={(e) => setNovoTelefone(maskPhone(e.target.value))}
                error={errors.novoTelefone}
                placeholder="(00) 00000-0000"
                disabled={saving}
              />
              <Input
                id="novo-email"
                label="E-mail (opcional)"
                type="email"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                error={errors.novoEmail}
                disabled={saving}
              />
              <Input
                id="novo-cpf-cnpj"
                label="CPF/CNPJ (opcional)"
                value={novoCpfCnpj}
                onChange={(e) => setNovoCpfCnpj(e.target.value)}
                disabled={saving}
              />
              <Button type="button" variant="ghost" onClick={resetClienteSelection} disabled={saving}>
                Cancelar e buscar outro cliente
              </Button>
            </div>
          ) : (
            <div>
              <Input
                id="busca-cliente"
                label="Buscar cliente existente"
                placeholder="Nome ou telefone"
                value={clienteQuery}
                onChange={(e) => setClienteQuery(e.target.value)}
                error={errors.cliente}
                disabled={saving}
              />
              {clienteQuery.trim().length >= 2 && (
                <div className="mt-2 overflow-hidden rounded-lg border border-slate-200/70 bg-white shadow-sm">
                  {clienteResults.length > 0 ? (
                    clienteResults.map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        onClick={() => setSelectedCliente(cliente)}
                        className="flex w-full flex-col items-start px-4 py-2 text-left hover:bg-slate-50"
                      >
                        <span className="text-sm text-slate-900">{cliente.nome}</span>
                        <span className="text-xs text-slate-500">{cliente.telefone}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3">
                      <p className="mb-2 text-sm text-slate-500">Nenhum resultado encontrado.</p>
                      <Button type="button" variant="ghost" onClick={startCreatingCliente}>
                        Criar novo cliente
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Equipamento
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="equipamento-tipo" className="text-[13px] font-medium text-slate-700">
                Tipo
              </label>
              <select
                id="equipamento-tipo"
                value={equipamentoTipo}
                onChange={(e) => setEquipamentoTipo(e.target.value)}
                disabled={saving}
                className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none transition-all duration-150 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
              >
                <option value="">Selecione</option>
                {equipmentList.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {errors.equipamentoTipo && (
                <span className="text-xs text-[#DC2626]">{errors.equipamentoTipo}</span>
              )}
            </div>
            <Input
              id="marca"
              label="Marca"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              error={errors.marca}
              maxLength={50}
              disabled={saving}
            />
            <Input
              id="modelo"
              label="Modelo"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              error={errors.modelo}
              maxLength={100}
              disabled={saving}
            />
            <Input
              id="numero-serie"
              label="Número de série (opcional)"
              value={numeroSerie}
              onChange={(e) => setNumeroSerie(e.target.value)}
              maxLength={50}
              disabled={saving}
            />
            <Input
              id="cor"
              label="Cor / Descrição (opcional)"
              value={cor}
              onChange={(e) => setCor(e.target.value)}
              maxLength={100}
              disabled={saving}
            />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Serviço
          </h2>
          <div className="space-y-4">
            <Textarea
              id="defeito-relatado"
              label="Defeito relatado"
              value={defeitoRelatado}
              onChange={(e) => setDefeitoRelatado(e.target.value)}
              error={errors.defeitoRelatado}
              maxLength={500}
              disabled={saving}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="prazo-previsto"
                label="Prazo previsto (opcional)"
                type="date"
                value={prazoPrevisto}
                onChange={(e) => setPrazoPrevisto(e.target.value)}
                error={errors.prazoPrevisto}
                disabled={saving}
              />
              <Input
                id="valor-orcamento"
                label="Valor do orçamento (opcional)"
                value={valorDisplay}
                onChange={(e) => {
                  const { display, cents } = maskCurrencyInput(e.target.value);
                  setValorDisplay(display);
                  setValorCents(cents);
                }}
                error={errors.valorOrcamento}
                placeholder="0,00"
                disabled={saving}
              />
            </div>
            <Textarea
              id="observacoes-internas"
              label="Observações internas (opcional)"
              value={observacoesInternas}
              onChange={(e) => setObservacoesInternas(e.target.value)}
              maxLength={500}
              disabled={saving}
            />
          </div>
        </section>

        {formError && (
          <p className="rounded-md bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">{formError}</p>
        )}

        <div className="flex items-center gap-4">
          <Button type="submit" loading={saving}>
            Salvar OS
          </Button>
          <button
            type="button"
            onClick={() => navigate("/ordens")}
            disabled={saving}
            className="text-sm text-slate-600 hover:underline"
          >
            Cancelar
          </button>
        </div>
      </form>
    </AppShell>
  );
}
