import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../lib/firebase";
import { AppShell } from "../components/layout/AppShell";
import { ClienteForm, type ClienteFormValues } from "../components/clientes/ClienteForm";
import { useEmpresa } from "../contexts/EmpresaContext";

export function NovoCliente() {
  const navigate = useNavigate();
  const { empresaId } = useEmpresa();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(values: ClienteFormValues) {
    if (!empresaId) throw new Error("Empresa não vinculada.");
    setSaving(true);
    try {
      const doc = await addDoc(collection(db, "clientes"), {
        empresaId,
        nome: values.nome,
        telefone: values.telefone,
        ...(values.email ? { email: values.email } : {}),
        ...(values.cpfCnpj ? { cpfCnpj: values.cpfCnpj } : {}),
        ...(values.endereco ? { endereco: values.endereco } : {}),
        ...(values.observacoes ? { observacoes: values.observacoes } : {}),
      });
      navigate(`/clientes/${doc.id}`, { state: { successMessage: "Cliente criado." } });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Novo Cliente">
      {!empresaId ? (
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Sua conta ainda não está vinculada a uma empresa.
        </p>
      ) : (
        <ClienteForm
          saving={saving}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/clientes")}
          submitLabel="Salvar"
        />
      )}
    </AppShell>
  );
}
