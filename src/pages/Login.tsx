import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  type AuthError,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormErrors {
  email?: string;
  password?: string;
}

function getAuthErrorMessage(error: AuthError): string {
  if (error.code === "auth/network-request-failed") {
    return "Sem conexão. Verifique sua internet.";
  }
  return "E-mail ou senha incorretos.";
}

export function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "reset">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  function validateEmail(value: string): string | undefined {
    if (!value) return "Preencha o e-mail para continuar.";
    if (!EMAIL_REGEX.test(value)) return "Formato de e-mail inválido.";
    return undefined;
  }

  function validatePassword(value: string): string | undefined {
    if (!value) return "Preencha a senha para continuar.";
    if (value.length < 6) return "A senha deve ter no mínimo 6 caracteres.";
    return undefined;
  }

  function handleEmailBlur() {
    setErrors((prev) => ({ ...prev, email: validateEmail(email) }));
  }

  function handlePasswordBlur() {
    setErrors((prev) => ({ ...prev, password: validatePassword(password) }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError("");

    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    setErrors({ email: emailError, password: passwordError });

    if (emailError || passwordError) return;

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setPassword("");
      setFormError(getAuthErrorMessage(error as AuthError));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetSubmit(event: FormEvent) {
    event.preventDefault();
    setResetError("");

    const emailError = validateEmail(resetEmail);
    if (emailError) {
      setResetError(emailError);
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSent(true);
    } catch (error) {
      setResetError(getAuthErrorMessage(error as AuthError));
    } finally {
      setResetLoading(false);
    }
  }

  const isFormIncomplete = !email || !password;

  if (mode === "reset") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--color-bg) px-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200/70 bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_20px_40px_-16px_rgba(15,23,42,0.16)]">
          <h1 className="mb-1 text-xl font-semibold text-slate-900">Redefinir senha</h1>
          <p className="mb-6 text-sm text-slate-600">
            Informe seu e-mail e enviaremos um link para redefinir sua senha.
          </p>

          {resetSent ? (
            <div className="flex flex-col gap-4">
              <p className="rounded-md bg-[#16A34A]/10 px-3 py-2 text-sm text-[#16A34A]">
                Link enviado! Confira sua caixa de entrada.
              </p>
              <Button type="button" variant="ghost" onClick={() => setMode("login")}>
                Voltar para o login
              </Button>
            </div>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleResetSubmit}>
              <Input
                id="reset-email"
                label="E-mail"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                error={resetError}
                autoComplete="email"
                placeholder="seu@email.com"
              />
              <Button type="submit" loading={resetLoading}>
                Enviar link de redefinição
              </Button>
              <Button type="button" variant="ghost" onClick={() => setMode("login")}>
                Voltar para o login
              </Button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--color-bg) px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200/70 bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_20px_40px_-16px_rgba(15,23,42,0.16)]">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-[#1A1A2E]">SmartOS</h1>
          <p className="mt-1 text-sm text-slate-600">Entre para continuar.</p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <Input
            id="email"
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={handleEmailBlur}
            error={errors.email}
            autoComplete="email"
            placeholder="seu@email.com"
            disabled={loading}
          />
          <Input
            id="password"
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={handlePasswordBlur}
            error={errors.password}
            autoComplete="current-password"
            disabled={loading}
          />

          {formError && (
            <p className="rounded-md bg-[#DC2626]/10 px-3 py-2 text-sm text-[#DC2626]">
              {formError}
            </p>
          )}

          <Button type="submit" loading={loading} disabled={isFormIncomplete}>
            Entrar
          </Button>

          <button
            type="button"
            onClick={() => setMode("reset")}
            className="text-sm text-[#2563EB] hover:underline"
          >
            Esqueci minha senha
          </button>
        </form>
      </div>
    </div>
  );
}
