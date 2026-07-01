import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { AppShell } from "../components/layout/AppShell";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { ConfirmModal } from "../components/os/ConfirmModal";
import { DataTable, type Column } from "../components/ui/DataTable";
import { useAuth } from "../contexts/AuthContext";
import { useEmpresa } from "../contexts/EmpresaContext";
import type { Usuario, UsuarioRole } from "../types/usuario";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface InviteErrors {
  nome?: string;
  email?: string;
}

export function GerenciarUsuarios() {
  const { user } = useAuth();
  const { empresaId, role } = useEmpresa();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novoRole, setNovoRole] = useState<UsuarioRole>("analista");
  const [inviteErrors, setInviteErrors] = useState<InviteErrors>({});
  const [inviteFormError, setInviteFormError] = useState("");
  const [inviting, setInviting] = useState(false);

  const [usuarioParaDesativar, setUsuarioParaDesativar] = useState<Usuario | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!empresaId || role !== "admin") {
      setLoading(false);
      return;
    }
    setLoading(true);
    setActionError("");
    getDocs(query(collection(db, "usuarios"), where("empresaId", "==", empresaId)))
      .then((snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Usuario, "id">),
        }));
        list.sort((a, b) => a.nome.localeCompare(b.nome));
        setUsuarios(list);
      })
      .catch(() => setActionError("Não foi possível carregar os usuários. Tente novamente."))
      .finally(() => setLoading(false));
  }, [empresaId, role]);

  if (role !== "admin") {
    return (
      <AppShell title="Gerenciar Usuários">
        <p className="text-sm text-slate-500">Acesso restrito a administradores.</p>
      </AppShell>
    );
  }

  function resetInviteForm() {
    setShowInviteModal(false);
    setNovoNome("");
    setNovoEmail("");
    setNovoRole("analista");
    setInviteErrors({});
    setInviteFormError("");
  }

  function validateInvite(): InviteErrors {
    const next: InviteErrors = {};
    if (!novoNome.trim()) next.nome = "Preencha o nome do usuário.";
    if (!novoEmail.trim() || !EMAIL_REGEX.test(novoEmail)) {
      next.email = "Informe um e-mail válido.";
    } else if (usuarios.some((u) => u.email.toLowerCase() === novoEmail.trim().toLowerCase())) {
      next.email = "Já existe um usuário com este e-mail.";
    }
    return next;
  }

  async function handleInvite() {
    setInviteFormError("");
    const validationErrors = validateInvite();
    setInviteErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    if (!empresaId) return;

    setInviting(true);
    try {
      const docRef = await addDoc(collection(db, "usuarios"), {
        nome: novoNome.trim(),
        email: novoEmail.trim(),
        role: novoRole,
        empresaId,
        ativo: true,
        criadoEm: serverTimestamp(),
      });
      setUsuarios((prev) =>
        [
          ...prev,
          {
            id: docRef.id,
            nome: novoNome.trim(),
            email: novoEmail.trim(),
            role: novoRole,
            empresaId,
            ativo: true,
          } as Usuario,
        ].sort((a, b) => a.nome.localeCompare(b.nome)),
      );
      resetInviteForm();
    } catch {
      setInviteFormError("Não foi possível criar o usuário. Tente novamente.");
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(usuario: Usuario, novoRole: UsuarioRole) {
    if (usuario.id === user?.uid) return;
    setActionError("");
    try {
      await updateDoc(doc(db, "usuarios", usuario.id), { role: novoRole });
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuario.id ? { ...u, role: novoRole } : u)),
      );
    } catch {
      setActionError("Não foi possível alterar o perfil. Tente novamente.");
    }
  }

  async function handleAtivar(usuario: Usuario) {
    setActionError("");
    try {
      await updateDoc(doc(db, "usuarios", usuario.id), { ativo: true });
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuario.id ? { ...u, ativo: true } : u)),
      );
    } catch {
      setActionError("Não foi possível ativar o usuário. Tente novamente.");
    }
  }

  async function handleDesativar() {
    if (!usuarioParaDesativar) return;
    setActionError("");
    await updateDoc(doc(db, "usuarios", usuarioParaDesativar.id), { ativo: false });
    setUsuarios((prev) =>
      prev.map((u) => (u.id === usuarioParaDesativar.id ? { ...u, ativo: false } : u)),
    );
    setUsuarioParaDesativar(null);
  }

  const colunas: Column<Usuario>[] = [
    {
      header: "Nome",
      render: (u) => <span className="font-medium text-slate-900">{u.nome}</span>,
    },
    {
      header: "E-mail",
      render: (u) => <span className="text-slate-600">{u.email}</span>,
    },
    {
      header: "Perfil",
      render: (u) =>
        u.id === user?.uid ? (
          <Badge label={u.role === "admin" ? "Administrador" : "Analista"} variant="info" />
        ) : (
          <select
            value={u.role}
            onChange={(e) => handleRoleChange(u, e.target.value as UsuarioRole)}
            className="h-8 rounded-lg border border-slate-200 px-2 text-xs text-slate-900 outline-none transition-all duration-150 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
          >
            <option value="admin">Administrador</option>
            <option value="analista">Analista</option>
          </select>
        ),
    },
    {
      header: "Status",
      render: (u) =>
        u.ativo !== false ? (
          <Badge label="Ativo" variant="success" />
        ) : (
          <Badge label="Inativo" variant="neutral" />
        ),
    },
    {
      header: "Ações",
      render: (u) =>
        u.id === user?.uid ? (
          <span className="text-xs text-slate-400">Você</span>
        ) : u.ativo !== false ? (
          <Button variant="ghost" onClick={() => setUsuarioParaDesativar(u)}>
            Desativar
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => handleAtivar(u)}>
            Ativar
          </Button>
        ),
    },
  ];

  return (
    <AppShell title="Gerenciar Usuários">
      <div className="max-w-4xl space-y-4">
        {actionError && (
          <p className="rounded-md bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">{actionError}</p>
        )}

        <div className="flex justify-end">
          <Button onClick={() => setShowInviteModal(true)}>Criar Usuário</Button>
        </div>

        {loading ? (
          <div className="h-48 animate-pulse rounded-lg bg-slate-200" />
        ) : usuarios.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum usuário cadastrado.</p>
        ) : (
          <DataTable columns={colunas} rows={usuarios} keyExtractor={(u) => u.id} />
        )}
      </div>

      {showInviteModal && (
        <Modal
          title="Criar Usuário"
          onClose={resetInviteForm}
          footer={
            <>
              <Button variant="ghost" onClick={resetInviteForm} disabled={inviting}>
                Cancelar
              </Button>
              <Button onClick={handleInvite} loading={inviting}>
                Criar
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              id="convite-nome"
              label="Nome"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              error={inviteErrors.nome}
              disabled={inviting}
            />
            <Input
              id="convite-email"
              label="E-mail"
              type="email"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              error={inviteErrors.email}
              disabled={inviting}
            />
            <div className="flex flex-col gap-1">
              <label htmlFor="convite-perfil" className="text-[13px] font-medium text-slate-700">
                Perfil
              </label>
              <select
                id="convite-perfil"
                value={novoRole}
                onChange={(e) => setNovoRole(e.target.value as UsuarioRole)}
                disabled={inviting}
                className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none transition-all duration-150 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
              >
                <option value="admin">Administrador</option>
                <option value="analista">Analista</option>
              </select>
            </div>
            {inviteFormError && (
              <p className="text-sm text-[#DC2626]">{inviteFormError}</p>
            )}
          </div>
        </Modal>
      )}

      {usuarioParaDesativar && (
        <ConfirmModal
          title="Desativar Usuário"
          message={`Tem certeza que deseja desativar "${usuarioParaDesativar.nome}"? Ele não conseguirá mais acessar o sistema, mas seus dados serão preservados.`}
          confirmLabel="Desativar"
          onClose={() => setUsuarioParaDesativar(null)}
          onConfirm={handleDesativar}
        />
      )}
    </AppShell>
  );
}
