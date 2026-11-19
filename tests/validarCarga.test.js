import { describe, expect, it } from 'vitest';
import { VALORES_INICIALES, armarPayload, validar } from '../src/utils/validarCarga';

/** Una carga completa válida; cada test cambia sólo lo que prueba. */
const carga = (cambios = {}) => ({
  ...VALORES_INICIALES,
  origen_provincia: '82',
  origen_id: '82084270',
  destino_provincia: '14',
  destino_id: '14014010',
  tipo_carga: 'Granos',
  peso: '12500',
  fecha: '2099-11-20',
  ...cambios,
});

describe('fecha de retiro opcional', () => {
  it('sin fecha no es un error ("A coordinar")', () => {
    expect(validar(carga({ fecha: '' })).fecha).toBeUndefined();
  });

  it('sin fecha se manda null', () => {
    expect(armarPayload(carga({ fecha: '' })).fecha).toBeNull();
    expect(armarPayload(carga()).fecha).toBe('2099-11-20');
  });

  it('una fecha pasada sigue siendo un error', () => {
    expect(validar(carga({ fecha: '2020-01-01' })).fecha).toBe('La fecha de retiro no puede ser anterior a hoy.');
  });
});
