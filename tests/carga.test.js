import { describe, expect, it } from 'vitest';
import { rutaPendientesAsignacion } from '../src/utils/carga';

describe('rutaPendientesAsignacion', () => {
  it('con una sola carga pendiente, lleva directo a su detalle', () => {
    expect(rutaPendientesAsignacion([{ id_carga: 12 }])).toBe('/cargas/12');
  });

  it('con varias, al listado filtrado por pendientes', () => {
    expect(rutaPendientesAsignacion([{ id_carga: 1 }, { id_carga: 5 }])).toBe('/cargas?estado=pendiente');
  });

  it('sin ninguna, también al listado (la tarjeta no se muestra, pero la ruta es válida)', () => {
    expect(rutaPendientesAsignacion([])).toBe('/cargas?estado=pendiente');
  });
});
