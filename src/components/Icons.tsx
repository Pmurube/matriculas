/** Iconos SVG en línea (decorativos: aria-hidden). */
type P = { className?: string };
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, viewBox: '0 0 24 24', 'aria-hidden': true };

export const IconHelp = ({ className = 'h-4 w-4' }: P) => (<svg {...base} className={className}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6" /><path d="M12 17h.01" /></svg>);
export const IconTrophy = ({ className = 'h-4 w-4' }: P) => (<svg {...base} className={className}><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6" /></svg>);
export const IconBadge = ({ className = 'h-4 w-4' }: P) => (<svg {...base} className={className}><circle cx="12" cy="9" r="5" /><path d="m9 13.5-1.5 7L12 18l4.5 2.5-1.5-7" /></svg>);
export const IconUser = ({ className = 'h-4 w-4' }: P) => (<svg {...base} className={className}><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0 1 16 0" /></svg>);
export const IconTimer = ({ className = 'h-5 w-5' }: P) => (<svg {...base} className={className}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M10 2h4M19 5l1.5-1.5" /></svg>);
export const IconFlag = ({ className = 'h-5 w-5' }: P) => (<svg {...base} className={className}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>);
export const IconFlame = ({ className = 'h-4 w-4' }: P) => (<svg {...base} className={className}><path d="M12 3s5 4.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 1.5-4S9 12 11 12c0-4 1-9 1-9Z" /></svg>);
export const IconCheck = ({ className = 'h-5 w-5' }: P) => (<svg {...base} className={className}><path d="m5 12 5 5 9-10" /></svg>);
export const IconX = ({ className = 'h-5 w-5' }: P) => (<svg {...base} className={className}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const IconSkip = ({ className = 'h-5 w-5' }: P) => (<svg {...base} className={className}><path d="m5 5 8 7-8 7M15 5v14" /></svg>);
