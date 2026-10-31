// Iconos de trazo simples, sin dependencias. Heredan el color del texto.
import type { ReactElement } from "react";

const TRAZOS: Record<string, ReactElement> = {
  cuenta: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  carrito: (
    <>
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M2 3h3l2.5 12h11L21 7H6.5" />
    </>
  ),
  llave: (
    <>
      <circle cx="8" cy="8" r="4" />
      <path d="M11 11l8 8M16 16l2-2M18 18l2-2" />
    </>
  ),
  posavasos: (
    <>
      <ellipse cx="12" cy="14" rx="9" ry="4" />
      <path d="M3 14v-2c0-2.2 4-4 9-4s9 1.8 9 4v2" />
    </>
  ),
  regalo: (
    <>
      <rect x="3" y="8" width="18" height="13" rx="2" />
      <path d="M12 8v13M3 12h18" />
      <path d="M12 8c-2-4-6-4-6-1.5S10 8 12 8zM12 8c2-4 6-4 6-1.5S14 8 12 8z" />
    </>
  ),
  documento: (
    <>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6M8 13h8M8 17h5" />
    </>
  ),
  subir: (
    <>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </>
  ),
  basura: (
    <>
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  cerrar: <path d="M6 6l12 12M18 6L6 18" />,
};

// La huellita va rellena, no con trazo.
const Huella = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <ellipse cx="6" cy="9" rx="2" ry="2.6" />
    <ellipse cx="10" cy="5.5" rx="2" ry="2.6" />
    <ellipse cx="14" cy="5.5" rx="2" ry="2.6" />
    <ellipse cx="18" cy="9" rx="2" ry="2.6" />
    <path d="M12 11c-3 0-6 3.5-6 6.2 0 1.8 1.6 2.6 3.2 2.1 1-.3 1.9-.6 2.8-.6s1.8.3 2.8.6c1.6.5 3.2-.3 3.2-2.1 0-2.7-3-6.2-6-6.2z" />
  </svg>
);

const Icono = ({ nombre, size = 22 }: { nombre: string; size?: number }) => {
  if (nombre === "huella") return <Huella size={size} />;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {TRAZOS[nombre]}
    </svg>
  );
};

export default Icono;
