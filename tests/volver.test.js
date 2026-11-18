import { describe, expect, it } from 'vitest';
import { desdeInicio, migasDesde, seccionDeOrigen, volverA } from '../src/utils/volver';

/** Sólo los nombres de las migas, en orden. */
const nombres = (migas) => migas.map((miga) => miga.nombre);

describe('migasDesde', () => {
  it('sin pantalla de origen, sólo Inicio', () => {
    expect(migasDesde(null, 'administrador')).toEqual([
      { ruta: '/panel-administrador', nombre: 'Inicio', estado: null },
    ]);
  });

  it('entrando directo a una carga (destino por defecto): Inicio › Cargas', () => {
    const migas = migasDesde({ ruta: '/cargas', texto: 'Volver a Cargas' }, 'administrador');
    expect(nombres(migas)).toEqual(['Inicio', 'Cargas']);
    expect(migas[1]).toEqual({ ruta: '/cargas', nombre: 'Cargas', estado: null });
  });

  it('sigue la cadena: inicio → Mis viajes → carga', () => {
    const estadoMisViajes = desdeInicio('camionero');
    const { volverA: volver } = volverA('/mis-viajes', 'Volver a Mis viajes', estadoMisViajes);
    const migas = migasDesde(volver, 'camionero');

    expect(nombres(migas)).toEqual(['Inicio', 'Mis viajes']);
    expect(migas[0].ruta).toBe('/panel-camionero');
    // La miga de Mis viajes devuelve el state con el que se había entrado ahí.
    expect(migas[1].estado).toBe(estadoMisViajes);
  });

  it('no repite Inicio si la cadena ya arranca en el panel', () => {
    const { volverA: volver } = desdeInicio('administrador');
    expect(nombres(migasDesde(volver, 'administrador'))).toEqual(['Inicio']);
  });

  it('mantiene la búsqueda de la ruta (filtros del listado)', () => {
    const { volverA: volver } = volverA('/cargas?estado=pendiente', 'Volver a Cargas');
    expect(migasDesde(volver, 'administrador')[1].ruta).toBe('/cargas?estado=pendiente');
  });

  it('usa el nombre de la miga si viene (Carga #45 en lugar de La carga)', () => {
    const estadoDetalle = volverA('/cargas', 'Volver a Cargas');
    const { volverA: volver } = volverA('/cargas/45', 'Volver a la carga', estadoDetalle, 'Carga #45');
    expect(nombres(migasDesde(volver, 'administrador'))).toEqual(['Inicio', 'Cargas', 'Carga #45']);
  });

  it('pasa a mayúscula el nombre que viene en minúscula', () => {
    const { volverA: volver } = volverA('/cargas/45', 'Volver a la carga');
    expect(nombres(migasDesde(volver, 'administrador'))).toEqual(['Inicio', 'Carga']);
  });
});

describe('seccionDeOrigen', () => {
  it('una carga abierta desde Mis viajes está dentro de Mis viajes', () => {
    const { volverA: volver } = volverA('/mis-viajes', 'Volver a Mis viajes', desdeInicio('camionero'));
    expect(seccionDeOrigen(volver, 'camionero')).toBe('/mis-viajes');
  });

  it('sin la búsqueda del listado', () => {
    const { volverA: volver } = volverA('/cargas?estado=pendiente', 'Volver a Cargas');
    expect(seccionDeOrigen(volver, 'administrador')).toBe('/cargas');
  });

  it('se toma la primera después del inicio, no la más cercana', () => {
    const estadoDetalle = volverA('/mis-viajes', 'Volver a Mis viajes');
    const { volverA: volver } = volverA('/cargas/1', 'Volver a la carga', estadoDetalle, 'Carga #1');
    expect(seccionDeOrigen(volver, 'camionero')).toBe('/mis-viajes');
  });

  it('null si se llegó desde el inicio o sin state', () => {
    expect(seccionDeOrigen(desdeInicio('camionero').volverA, 'camionero')).toBeNull();
    expect(seccionDeOrigen(null, 'camionero')).toBeNull();
  });
});
