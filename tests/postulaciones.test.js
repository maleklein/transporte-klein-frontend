import { describe, expect, it } from 'vitest';
import { esViajeEnCurso, etiquetaNoSalio, grupoDePostulacion } from '../src/utils/postulaciones';

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

describe('etiquetaNoSalio', () => {
  it('una carga cancelada dice "Carga cancelada", aunque la postulación haya quedado rechazada', () => {
    // Desde el PR 68 del backend, al cancelar, las postulaciones en espera pasan a rechazada.
    expect(etiquetaNoSalio(postulacion('rechazada', 'cancelada'))).toBe('Carga cancelada');
    // Cargas canceladas antes de ese cambio, si no se corrió la migración 010.
    expect(etiquetaNoSalio(postulacion('pendiente', 'cancelada'))).toBe('Carga cancelada');
  });

  it('una carga que se asignó a otro camionero dice "No elegida"', () => {
    expect(etiquetaNoSalio(postulacion('rechazada', 'aceptada'))).toBe('No elegida');
    expect(etiquetaNoSalio(postulacion('rechazada', 'en_viaje'))).toBe('No elegida');
    expect(etiquetaNoSalio(postulacion('rechazada', 'entregada'))).toBe('No elegida');
  });
});
