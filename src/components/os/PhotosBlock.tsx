import { useRef, useState } from "react";
import { X } from "lucide-react";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../../lib/firebase";
import { compressImage } from "../../lib/imageCompression";
import type { FotoOS } from "../../types/ordemServico";

interface PhotosBlockProps {
  empresaId: string;
  osId: string;
  fotos: FotoOS[];
  canManage: boolean;
  isAdmin: boolean;
  onChange: (fotos: FotoOS[]) => Promise<void>;
}

export function PhotosBlock({ empresaId, osId, fotos, canManage, isAdmin, onChange }: PhotosBlockProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setUploading(true);
    try {
      const blob = await compressImage(file);
      const path = `empresas/${empresaId}/ordens/${osId}/${crypto.randomUUID()}.jpg`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      await onChange([...fotos, { url, path }]);
    } catch {
      setError("Não foi possível enviar a foto. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(foto: FotoOS) {
    try {
      await deleteObject(ref(storage, foto.path));
    } catch {
      // arquivo pode já ter sido removido — segue para limpar a referência
    }
    await onChange(fotos.filter((item) => item.path !== foto.path));
  }

  return (
    <div>
      {error && <p className="mb-3 text-sm text-[#DC2626]">{error}</p>}

      <div className="grid grid-cols-3 gap-3">
        {fotos.map((foto) => (
          <div key={foto.path} className="group relative aspect-square overflow-hidden rounded-md border border-slate-200">
            <button type="button" onClick={() => setLightboxUrl(foto.url)} className="h-full w-full">
              <img src={foto.url} alt="Foto da OS" className="h-full w-full object-cover" />
            </button>
            {canManage && isAdmin && (
              <button
                type="button"
                onClick={() => handleRemove(foto)}
                aria-label="Remover foto"
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}

        {canManage && fotos.length < 3 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center rounded-md border-2 border-dashed border-slate-300 text-xs text-slate-500 hover:border-[#2563EB] hover:bg-blue-50 disabled:opacity-50"
          >
            {uploading ? "Enviando..." : "Adicionar foto"}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelected}
        className="hidden"
      />

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightboxUrl(null)}
        >
          <img src={lightboxUrl} alt="Foto ampliada" className="max-h-[80vh] max-w-[80vw]" />
        </div>
      )}
    </div>
  );
}
