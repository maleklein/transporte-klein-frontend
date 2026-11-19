import { describe, expect, it } from 'vitest';
import { valoresCambiaron } from '../src/utils/formulario';

describe('valoresCambiaron', () => {
  it('sin cambios, false', () => {
    expect(valoresCambiaron({ nombre: 'Ana', peso: '1200' }, { nombre: 'Ana', peso: '1200' })).toBe(false);
  });

  it('un campo distinto, true', () => {
    expect(valoresCambiaron({ nombre: 'Ana', peso: '1300' }, { nombre: 'Ana', peso: '1200' })).toBe(true);
  });

  it('compara como texto: 1200 y "1200" son iguales', () => {
    expect(valoresCambiaron({ peso: '1200' }, { peso: 1200 })).toBe(false);
  });

  it('vacío, null y un campo que no está cuentan como iguales', () => {
    expect(valoresCambiaron({ observaciones: '' }, { observaciones: null })).toBe(false);
    expect(valoresCambiaron({ observaciones: '' }, {})).toBe(false);
  });

  it('un campo nuevo con algo escrito, true', () => {
    expect(valoresCambiaron({ ubicacion: 'Paraná' }, {})).toBe(true);
  });

  it('si todavía no se cargó el formulario, false', () => {
    expect(valoresCambiaron(null, { nombre: 'Ana' })).toBe(false);
    expect(valoresCambiaron({ nombre: 'Ana' }, null)).toBe(false);
  });
});
