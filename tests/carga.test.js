import { describe, expect, it } from 'vitest';
import { rutaCargasPorEstado, rutaPendientesAsignacion, textoPeriodoCreacion } from '../src/utils/carga';

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

describe('rutaCargasPorEstado', () => {
  it('filtra por el estado y por el período del conteo', () => {
    expect(rutaCargasPorEstado('disponible', { fecha_desde: '2026-10-19', fecha_hasta: '2026-11-17' }))
      .toBe('/cargas?estado=disponible&creada_desde=2026-10-19&creada_hasta=2026-11-17');
  });

  it('sin período, sólo por el estado', () => {
    expect(rutaCargasPorEstado('en_viaje')).toBe('/cargas?estado=en_viaje');
  });
});

describe('textoPeriodoCreacion', () => {
  it('con las dos fechas', () => {
    expect(textoPeriodoCreacion('2026-10-19', '2026-11-17')).toBe('Creadas del 19/10/2026 al 17/11/2026');
  });

  it('con una sola', () => {
    expect(textoPeriodoCreacion('2026-10-19', '')).toBe('Creadas desde el 19/10/2026');
    expect(textoPeriodoCreacion('', '2026-11-17')).toBe('Creadas hasta el 17/11/2026');
  });

  it('sin ninguna, vacío', () => {
    expect(textoPeriodoCreacion('', '')).toBe('');
  });
});
