/**
 * Íconos en SVG embebido (sin dependencias externas).
 * Son decorativos: siempre acompañan a un texto, nunca lo reemplazan.
 */

const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};

export function IconoUsuarioMas(props) {
  return (
    <svg {...base} {...props}>
      <path d="M15 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}

export function IconoCerrar(props) {
  return (
    <svg {...base} {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function IconoCheck(props) {
  return (
    <svg {...base} {...props}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function IconoAlerta(props) {
  return (
    <svg {...base} width={18} height={18} {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v5M12 16h.01" />
    </svg>
  );
}

export function IconoCamion(props) {
  return (
    <svg {...base} {...props}>
      <path d="M1 3h13v13H1zM14 8h4l3 3v5h-7" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="17.5" cy="18.5" r="2.5" />
    </svg>
  );
}

export function IconoCajaMas(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21 3 16.5v-9L12 3l9 4.5v4" />
      <path d="M3 7.5 12 12l9-4.5M12 12v9" />
      <path d="M18 15v6M21 18h-6" />
    </svg>
  );
}

export function IconoGuardar(props) {
  return (
    <svg {...base} {...props}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </svg>
  );
}
