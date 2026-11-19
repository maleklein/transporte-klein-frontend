import { describe, expect, it } from 'vitest';
import {
  fechaATexto,
  nombrePeriodoCreacion,
  rangoDePeriodo,
  rutaCargasPorEstado,
  retiroVencido,
  rutaPendientesAsignacion,
  textoAFecha,
  textoFechaRetiro,
} from '../src/utils/carga';

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

// Martes 17/11/2026, al mediodía: el día no cambia por la zona horaria.
const HOY = new Date(2026, 10, 17, 12, 0);

describe('fechaATexto y textoAFecha', () => {
  it('ida y vuelta en hora local', () => {
    expect(fechaATexto(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(fechaATexto(textoAFecha('2026-11-01'))).toBe('2026-11-01');
  });

  it('un texto que no es AAAA-MM-DD no es una fecha', () => {
    expect(textoAFecha('01/11/2026')).toBeUndefined();
    expect(textoAFecha('')).toBeUndefined();
  });
});

describe('rangoDePeriodo', () => {
  it('últimos 7 y 30 días incluyen hoy', () => {
    expect(rangoDePeriodo('ultimos-7', HOY)).toEqual({ desde: '2026-11-11', hasta: '2026-11-17' });
    expect(rangoDePeriodo('ultimos-30', HOY)).toEqual({ desde: '2026-10-19', hasta: '2026-11-17' });
  });

  it('este mes arranca el día 1', () => {
    expect(rangoDePeriodo('este-mes', HOY)).toEqual({ desde: '2026-11-01', hasta: '2026-11-17' });
  });
});

describe('nombrePeriodoCreacion', () => {
  it('sin fechas, vacío ("Cualquier fecha")', () => {
    expect(nombrePeriodoCreacion('', '', HOY)).toBe('');
  });

  it('el nombre del acceso rápido si coincide', () => {
    expect(nombrePeriodoCreacion('2026-10-19', '2026-11-17', HOY)).toBe('Últimos 30 días');
    expect(nombrePeriodoCreacion('2026-11-01', '2026-11-17', HOY)).toBe('Este mes');
  });

  it('si no, el rango', () => {
    expect(nombrePeriodoCreacion('2026-11-01', '2026-11-15', HOY)).toBe('01/11/2026 – 15/11/2026');
    expect(nombrePeriodoCreacion('2026-11-03', '2026-11-03', HOY)).toBe('03/11/2026');
  });

  it('con una sola punta', () => {
    expect(nombrePeriodoCreacion('2026-11-01', '', HOY)).toBe('Desde el 01/11/2026');
    expect(nombrePeriodoCreacion('', '2026-11-15', HOY)).toBe('Hasta el 15/11/2026');
  });
});

describe('fecha de retiro opcional', () => {
  it('sin fecha se muestra "A coordinar"; con fecha, el día', () => {
    expect(textoFechaRetiro(null)).toBe('A coordinar');
    expect(textoFechaRetiro('')).toBe('A coordinar');
    expect(textoFechaRetiro('2026-11-25')).toBe('25/11/2026');
  });

  it('una carga sin fecha nunca tiene el retiro vencido', () => {
    expect(retiroVencido({ estado_actual: 'disponible', fecha: null })).toBe(false);
    expect(retiroVencido({ estado_actual: 'pendiente', fecha: null })).toBe(false);
  });

  it('con la fecha pasada y sin asignar, sí', () => {
    expect(retiroVencido({ estado_actual: 'disponible', fecha: '2020-01-01' })).toBe(true);
    expect(retiroVencido({ estado_actual: 'aceptada', fecha: '2020-01-01' })).toBe(false);
  });
});
