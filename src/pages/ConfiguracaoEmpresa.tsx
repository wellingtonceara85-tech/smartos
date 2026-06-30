import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase";
import { AppShell } from "../components/layout/AppShell";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { ConfirmModal } from "../components/os/ConfirmModal";
import { useEmpresa } from "../contexts/EmpresaContext";
import { maskCpfCnpj, maskPhone } from "../lib/masks";
import { EQUIPMENT_TYPES } from "../lib/equipmentTypes";

const LOGO_MAX_BYTES = 500 * 1024; // 500 KB
const TIPOS_MAX = 20;
const PRAZO_OPTIONS = [
  { label: "Sem garantia", value: 0 },
  { label: "30 dias", value: 30 },
  { label: "60 dias", value: 60 },
  { label: "90 dias", value: 90 },
  { label: "180 dias", value: 180 },
  { label: "365 dias", value: 365 },
];

export function ConfiguracaoEmpresa() {
  const navigate = useNavigate();
  const { empresaId, role, prazoGarantiaDias, garantiaTexto, tiposEquipamento, logoUrl, reloadConfig } = useEmpresa();

  // Seção 1 — dados da empresa (carregamos separado para ter cnpj/telefone/endereco/nome)
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");

  // Logo
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(logoUrl);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [pendingLogoPreview, setPendingLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Seção 2 — garantia
  const [prazo, setPrazo] = useState(prazoGarantiaDias);
  const [textoGarantia, setTextoGarantia] = useState(garantiaTexto);

  // Seção 3 — tipos de equipamento
  const [tipos, setTipos] = useState<string[]>(tiposEquipamento.length > 0 ? tiposEquipamento : EQUIPMENT_TYPES);
  const [novoTipo, setNovoTipo] = useState("");
  const [tipoParaRemover, setTipoParaRemover] = useState<string | null>(null);
  const [tipoError, setTipoError] = useState("");

  // Estado geral
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Carrega campos não presentes no contexto: nome, cnpj, telefone, endereco
  useEffect(() => {
    if (!empresaId) return;
    getDoc(doc(db, "empresas", empresaId))
      .then((snap) => {
        const data = snap.data();
        if (!data) return;
        setNome(data.nome ?? "");
        setCnpj(data.cnpj ?? "");
        setTelefone(data.telefone ?? "");
        setEndereco(data.endereco ?? "");
      })
      .catch(() => setSaveError("Não foi possível carregar os dados da empresa. Tente recarregar a página."));
  }, [empresaId]);

  // Sincroniza contexto → estado local quando contexto carrega
  useEffect(() => {
    setPrazo(prazoGarantiaDias);
    setTextoGarantia(garantiaTexto);
    setTipos(tiposEquipamento.length > 0 ? tiposEquipamento : EQUIPMENT_TYPES);
    setCurrentLogoUrl(logoUrl);
  }, [prazoGarantiaDias, garantiaTexto, tiposEquipamento, logoUrl]);

  if (role !== "admin") {
    return (
      <AppShell title="Configurações">
        <p className="text-sm text-slate-500">Acesso restrito a administradores.</p>
      </AppShell>
    );
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setLogoError("");
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setLogoError("Apenas PNG ou JPG são aceitos.");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoError("O arquivo deve ter no máximo 500 KB.");
      return;
    }

    setPendingLogoFile(file);
    setPendingLogoPreview(URL.createObjectURL(file));
  }

  function handleAdicionarTipo() {
    const novo = novoTipo.trim();
    if (!novo) return;
    setTipoError("");
    if (tipos.length >= TIPOS_MAX) {
      setTipoError(`Máximo de ${TIPOS_MAX} tipos atingido.`);
      return;
    }
    if (tipos.some((t) => t.toLowerCase() === novo.toLowerCase())) {
      setTipoError("Este tipo já existe.");
      return;
    }
    setTipos((prev) => [...prev, novo]);
    setNovoTipo("");
  }

  function confirmarRemocao() {
    if (!tipoParaRemover) return;
    setTipos((prev) => prev.filter((t) => t !== tipoParaRemover));
    setTipoParaRemover(null);
  }

  async function handleSave() {
    if (!empresaId) return;
    setSaving(true);
    setSaveError("");
    setSuccessMessage("");

    try {
      let finalLogoUrl = currentLogoUrl;

      // Upload do logo se houver arquivo pendente
      if (pendingLogoFile) {
        const ext = pendingLogoFile.type === "image/png" ? "png" : "jpg";
        const storageRef = ref(storage, `empresas/${empresaId}/logo.${ext}`);
        await uploadBytes(storageRef, pendingLogoFile);
        finalLogoUrl = await getDownloadURL(storageRef);
        setCurrentLogoUrl(finalLogoUrl);
        setPendingLogoFile(null);
        if (pendingLogoPreview) {
          URL.revokeObjectURL(pendingLogoPreview);
          setPendingLogoPreview(null);
        }
      }

      await updateDoc(doc(db, "empresas", empresaId), {
        nome: nome.trim(),
        cnpj: cnpj.trim(),
        telefone: telefone.trim(),
        endereco: endereco.trim(),
        logoUrl: finalLogoUrl ?? "",
        prazoGarantiaDias: prazo,
        garantiaTexto: textoGarantia.trim(),
        tiposEquipamento: tipos,
      });

      await reloadConfig();
      setSuccessMessage("Configurações salvas com sucesso.");
    } catch {
      setSaveError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const logoExibida = pendingLogoPreview ?? currentLogoUrl;

  return (
    <AppShell title="Configurações da Empresa">
      <div className="max-w-2xl space-y-6">
        {successMessage && (
          <p className="rounded-md bg-[#16A34A]/10 px-4 py-3 text-sm text-[#16A34A]">{successMessage}</p>
        )}
        {saveError && (
          <p className="rounded-md bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">{saveError}</p>
        )}

        {/* Seção 1 — Dados da empresa */}
        <section className="surface-card">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Dados da Empresa
          </h2>
          <div className="space-y-4">
            <Input
              id="cfg-nome"
              label="Nome da empresa"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={saving}
            />
            <Input
              id="cfg-cnpj"
              label="CNPJ"
              value={cnpj}
              onChange={(e) => setCnpj(maskCpfCnpj(e.target.value))}
              placeholder="00.000.000/0000-00"
              disabled={saving}
            />
            <Input
              id="cfg-telefone"
              label="Telefone / WhatsApp"
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              disabled={saving}
            />
            <Input
              id="cfg-endereco"
              label="Endereço"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              disabled={saving}
            />

            {/* Logo */}
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-slate-700">Logo da empresa</span>
              <div className="flex items-center gap-4">
                {logoExibida ? (
                  <img
                    src={logoExibida}
                    alt="Logo da empresa"
                    className="h-16 w-16 rounded-md border border-slate-200 object-contain p-1"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-slate-300 text-xs text-slate-400">
                    Sem logo
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={saving}
                  >
                    {logoExibida ? "Trocar logo" : "Enviar logo"}
                  </Button>
                  <p className="text-xs text-slate-400">PNG ou JPG · máx. 500 KB</p>
                </div>
              </div>
              {logoError && <p className="text-xs text-[#DC2626]">{logoError}</p>}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleLogoChange}
                className="hidden"
              />
            </div>
          </div>
        </section>

        {/* Seção 2 — Garantia */}
        <section className="surface-card">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Garantia
          </h2>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-slate-700">Prazo padrão</span>
              <div className="flex flex-wrap gap-2">
                {PRAZO_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPrazo(opt.value)}
                    disabled={saving}
                    className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                      prazo === opt.value
                        ? "border-[#2563EB] bg-[#2563EB] text-white"
                        : "border-slate-200 text-slate-700 hover:border-[#2563EB] hover:text-[#2563EB]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              id="cfg-garantia-texto"
              label="Texto da garantia"
              value={textoGarantia}
              onChange={(e) => setTextoGarantia(e.target.value)}
              maxLength={500}
              disabled={saving}
            />
          </div>
        </section>

        {/* Seção 3 — Tipos de equipamento */}
        <section className="surface-card">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Tipos de Equipamento
          </h2>
          <div className="space-y-3">
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {tipos.map((tipo) => (
                <li
                  key={tipo}
                  className="flex items-center justify-between px-3 py-2 text-sm text-slate-700"
                >
                  {tipo}
                  <button
                    type="button"
                    onClick={() => setTipoParaRemover(tipo)}
                    disabled={saving}
                    className="text-xs text-[#DC2626] hover:underline disabled:opacity-40"
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>

            {tipos.length < TIPOS_MAX && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={novoTipo}
                  onChange={(e) => {
                    setNovoTipo(e.target.value);
                    setTipoError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleAdicionarTipo()}
                  placeholder="Novo tipo…"
                  maxLength={50}
                  disabled={saving}
                  className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
                />
                <Button variant="ghost" onClick={handleAdicionarTipo} disabled={saving || !novoTipo.trim()}>
                  Adicionar
                </Button>
              </div>
            )}
            {tipoError && <p className="text-xs text-[#DC2626]">{tipoError}</p>}
            <p className="text-xs text-slate-400">{tipos.length}/{TIPOS_MAX} tipos</p>
          </div>
        </section>

        {/* Botões */}
        <div className="flex items-center gap-4">
          <Button onClick={handleSave} loading={saving}>
            Salvar
          </Button>
          <Button variant="ghost" onClick={() => navigate("/dashboard")} disabled={saving}>
            Cancelar
          </Button>
        </div>
      </div>

      {tipoParaRemover && (
        <ConfirmModal
          title="Remover tipo de equipamento"
          message={`Deseja remover "${tipoParaRemover}"? OS existentes com este tipo não serão afetadas.`}
          confirmLabel="Remover"
          onClose={() => setTipoParaRemover(null)}
          onConfirm={async () => confirmarRemocao()}
        />
      )}
    </AppShell>
  );
}
