import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { AppShell } from "../components/layout/AppShell";
import { ClienteForm, type ClienteFormValues } from "../components/clientes/ClienteForm";
import { useEmpresa } from "../contexts/EmpresaContext";
import type { Cliente } from "../types/cliente";

export function EditarCliente() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { empresaId } = useEmpresa();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
    getDoc(doc(db, "clientes", id))
      .then((snapshot) => {
        if (!snapshot.exists()) {
          setCliente(null);
        } else {
          setCliente({ id: snapshot.id, ...(snapshot.data() as Omit<Cliente, "id">) });
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(values: ClienteFormValues) {
    if (!id) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "clientes", id), {
        nome: values.nome,
        telefone: values.telefone,
        email: values.email || "",
        cpfCnpj: values.cpfCnpj || "",
        endereco: values.endereco || "",
        observacoes: values.observacoes || "",
      });
      navigate(`/clientes/${id}`, { state: { successMessage: "Cliente atualizado." } });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Editar Cliente">
        <div className="space-y-3 max-w-xl">
          {[1, 2, 3, 4].map((k) => (
            <div key={k} className="h-12 animate-pulse rounded-md bg-slate-200" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (error || !cliente || (empresaId && cliente.empresaId !== empresaId)) {
    return (
      <AppShell title="Editar Cliente">
        <p className="rounded-md bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">
          {error ? "Não foi possível carregar o cliente. Tente novamente." : "Cliente não encontrado."}
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell title={`Editar ${cliente.nome}`}>
      <ClienteForm
        initialValues={{
          nome: cliente.nome,
          telefone: cliente.telefone,
          email: cliente.email ?? "",
          cpfCnpj: cliente.cpfCnpj ?? "",
          endereco: cliente.endereco ?? "",
          observacoes: cliente.observacoes ?? "",
        }}
        saving={saving}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/clientes/${id}`)}
        submitLabel="Salvar alterações"
      />
    </AppShell>
  );
}
