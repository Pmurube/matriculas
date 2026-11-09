// Tipos MÍNIMOS solo para validación sin red. El proyecto real usa @types/react.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'react' {
  export type ReactNode = any;
  export type FormEvent = { preventDefault(): void };
  export type PointerEvent = { preventDefault(): void };
  export type SetState<T> = (v: T | ((prev: T) => T)) => void;
  export function useState<T>(init: T | (() => T)): [T, SetState<T>];
  export function useEffect(fn: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useCallback<T extends (...a: any[]) => any>(fn: T, deps: readonly unknown[]): T;
  export function useRef<T>(init: T): { current: T };
  export function useRef<T>(init: T | null): { current: T | null };
  export function useId(): string;
  export const StrictMode: (p: { children?: any }) => any;
}
declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}
declare module 'react-dom/client' {
  export function createRoot(el: Element): { render(node: any): void };
}
declare global {
  namespace JSX {
    type Element = any;
    interface IntrinsicElements { [tag: string]: any }
    interface IntrinsicAttributes { key?: any }
  }
}
export {};
