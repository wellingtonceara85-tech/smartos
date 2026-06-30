import { useState, type FormEvent } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { maskPhone, maskCpfCnpj } from "../../lib/masks";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ClienteFormValues {
  nome: string;
  telefone: string;
  email: string;
  cpfCnpj: string;
  endereco: string;
  observacoes: string;
}

interface FormErrors {
  nome?: string;
  telefone?: string;
  email?: string;
  cpfCnpj?: string;
}

interface ClienteFormProps {
  initialValues?: Partial<ClienteFormValues>;
  saving: boolean;
  onSubmit: (values: ClienteFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function ClienteForm({
  initialValues = {},
  saving,
  onSubmit,
  onCancel,
  submitLabel = "Salvar",
}: ClienteFormProps) {
  const [nome, setNome] = useState(initialValues.nome ?? "");
  const [telefone, setTelefone] = useState(initialValues.telefone ?? "");
  const [email, setEmail] = useState(initialValues.email ?? "");
  const [cpfCnpj, setCpfCnpj] = useState(initialValues.cpfCnpj ?? "");
  const [endereco, setEndereco] = useState(initialValues.endereco ?? "");
  const [observacoes, setObservacoes] = useState(initialValues.observacoes ?? "");

  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState("");

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!nome.trim()) next.nome = "Nome é obrigatório.";
    const phoneDigits = telefone.replace(/\D/g, "");
    if (phoneDigits.length < 10) next.telefone = "Informe um telefone válido com DDD.";
    if (email && !EMAIL_REGEX.test(email)) next.email = "Formato de e-mail inválido.";
    if (cpfCnpj) {
      const digits = cpfCnpj.replace(/\D/g, "");
      if (digits.length !== 11 && digits.length !== 14) {
        next.cpfCnpj = "CPF deve ter 11 dígitos ou CNPJ 14 dígitos.";
      }
    }
    return next;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      await onSubmit({ nome: nome.trim(), telefone, email, cpfCnpj, endereco: endereco.trim(), observacoes: observacoes.trim() });
    } catch {
      setFormError("Não foi possível salvar. Verifique sua conexão.");
    }
  }

  return (
    <form className="max-w-xl space-y-4" onSubmit={handleSubmit} noValidate>
      <Input
        id="nome"
        label="Nome completo"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        error={errors.nome}
        maxLength={100}
        disabled={saving}
      />
      <Input
        id="telefone"
        label="Telefone"
        value={telefone}
        onChange={(e) => setTelefone(maskPhone(e.target.value))}
        error={errors.telefone}
        placeholder="(00) 00000-0000"
        disabled={saving}
      />
      <Input
        id="email"
        label="E-mail (opcional)"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        disabled={saving}
      />
      <Input
        id="cpf-cnpj"
        label="CPF / CNPJ (opcional)"
        value={cpfCnpj}
        onChange={(e) => setCpfCnpj(maskCpfCnpj(e.target.value))}
        error={errors.cpfCnpj}
        placeholder="000.000.000-00 ou 00.000.000/0000-00"
        disabled={saving}
      />
      <Input
        id="endereco"
        label="Endereço (opcional)"
        value={endereco}
        onChange={(e) => setEndereco(e.target.value)}
        maxLength={200}
        disabled={saving}
      />
      <Textarea
        id="observacoes"
        label="Observações (opcional)"
        value={observacoes}
        onChange={(e) => setObservacoes(e.target.value)}
        maxLength={300}
        disabled={saving}
      />

      {formError && (
        <p className="rounded-md bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">{formError}</p>
      )}

      <div className="flex items-center gap-4 pt-2">
        <Button type="submit" loading={saving}>
          {submitLabel}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="text-sm text-slate-600 hover:underline"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
