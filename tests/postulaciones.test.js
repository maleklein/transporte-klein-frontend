import { describe, expect, it } from 'vitest';
import { esViajeEnCurso, grupoDePostulacion } from '../src/utils/postulaciones';

const postulacion = (estado, estadoCarga) => ({ estado, estado_actual: estadoCarga });

describe('grupoDePostulacion', () => {
  it('un viaje asignado que todavía no terminó va en "asignado"', () => {
    expect(grupoDePostulacion(postulacion('aceptada', 'aceptada'))).toBe('asignado');
    expect(grupoDePostulacion(postulacion('aceptada', 'en_viaje'))).toBe('asignado');
  });

  it('un viaje ya entregado va aparte, en "entregado"', () => {
    expect(grupoDePostulacion(postulacion('aceptada', 'entregada'))).toBe('entregado');
  });

  it('una postulación con la carga abierta va en "espera"', () => {
    expect(grupoDePostulacion(postulacion('pendiente', 'disponible'))).toBe('espera');
    expect(grupoDePostulacion(postulacion('pendiente', 'pendiente'))).toBe('espera');
  });

  it('una no elegida, o de una carga cancelada, va en "cerrada"', () => {
    expect(grupoDePostulacion(postulacion('rechazada', 'aceptada'))).toBe('cerrada');
    expect(grupoDePostulacion(postulacion('pendiente', 'cancelada'))).toBe('cerrada');
  });
});

describe('esViajeEnCurso', () => {
  it('cuenta los asignados que no terminaron, no los entregados', () => {
    expect(esViajeEnCurso(postulacion('aceptada', 'aceptada'))).toBe(true);
    expect(esViajeEnCurso(postulacion('aceptada', 'en_viaje'))).toBe(true);
    expect(esViajeEnCurso(postulacion('aceptada', 'entregada'))).toBe(false);
    expect(esViajeEnCurso(postulacion('pendiente', 'pendiente'))).toBe(false);
  });
});
