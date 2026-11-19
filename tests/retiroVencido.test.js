import { describe, expect, it } from 'vitest';
import { textosRetiroVencido } from '../src/utils/estadosCarga';

describe('textosRetiroVencido', () => {
  it('el aviso de arriba sólo dice qué pasa', () => {
    for (const estado of ['disponible', 'pendiente']) {
      expect(textosRetiroVencido(estado, '25/09/2026').aviso).toBe('La fecha de retiro (25/09/2026) ya pasó.');
    }
  });

  it('disponible: pide cambiar la fecha para volver a publicarla', () => {
    const textos = textosRetiroVencido('disponible', '25/09/2026');
    expect(textos.titulo).toBe('Cambiá la fecha para volver a publicarla');
    expect(textos.detalle).toContain('Los camioneros ya no la ven.');
    expect(textos.postulados).toBeUndefined();
  });

  it('pendiente: pide cambiar la fecha para poder asignarla, y lo dice en la lista de postulados', () => {
    const textos = textosRetiroVencido('pendiente', '25/09/2026');
    expect(textos.titulo).toBe('Cambiá la fecha para poder asignarla');
    expect(textos.detalle).toContain('siguen en la lista');
    expect(textos.postulados).toBe('Para asignar a uno, primero cambiá la fecha de retiro: ya pasó.');
  });

  it('el progreso ya no dice "esperando transportista" ni que la pueden ver', () => {
    for (const estado of ['disponible', 'pendiente']) {
      const { titulo, detalle } = textosRetiroVencido(estado, '25/09/2026');
      expect(titulo).not.toMatch(/esperando transportista/i);
      expect(detalle).not.toMatch(/ya la pueden ver/i);
    }
  });

  it('el recorrido muestra "Vencida" con el día del retiro, no "Disponible" ni "Pendiente"', () => {
    for (const estado of ['disponible', 'pendiente']) {
      const { paso, marca } = textosRetiroVencido(estado, '18/09/2026');
      expect(paso).toBe('Vencida');
      expect(marca).toBe('retiro 18/09');
    }
  });

  it('en los demás estados no hay textos de retiro vencido', () => {
    for (const estado of ['aceptada', 'en_viaje', 'entregada', 'cancelada']) {
      expect(textosRetiroVencido(estado, '25/09/2026')).toBeNull();
    }
  });
});
