import { getHostReact } from '@coongro/plugin-sdk';

const React = getHostReact();
const { useState, useEffect } = React;

/**
 * Breakpoint vía matchMedia en vez de utilidades `sm:grid-cols-*`. El grid responsivo
 * de Tailwind es frágil entre plugins: cada plugin embebe su propia tailwind.css con la
 * regla base `.grid-cols-1`, y si otra se carga DESPUÉS, su `.grid-cols-1` le gana al
 * `@media sm:grid-cols-3` y colapsa la grilla. Resolver el ancho en JS + style inline
 * evita depender del orden de carga.
 */
export function useMinWidth(px: number): boolean {
  const query = `(min-width: ${px}px)`;
  const [match, setMatch] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatch(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return match;
}
