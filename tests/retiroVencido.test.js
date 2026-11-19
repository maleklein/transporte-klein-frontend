import { describe, expect, it } from 'vitest';
import { textosRetiroVencido } from '../src/utils/estadosCarga';

describe('textosRetiroVencido', () => {
  it('disponible: dice que los camioneros ya no la ven, en el aviso y en el progreso', () => {
    const textos = textosRetiroVencido('disponible', '25/09/2026');
    expect(textos.aviso).toBe(
      'La fecha de retiro (25/09/2026) ya pasó y la carga sigue sin camionero asignado. Los camioneros ya no la ven ni pueden postularse. Cambiale la fecha o cancelala.',
    );
    expect(textos.titulo).toBe('Retiro vencido, sin postulados');
    expect(textos.detalle).toContain('Los camioneros ya no la ven ni pueden postularse.');
  });

  it('el progreso ya no dice "esperando transportista" ni que la pueden ver', () => {
    for (const estado of ['disponible', 'pendiente']) {
      const { titulo, detalle } = textosRetiroVencido(estado, '25/09/2026');
      expect(titulo).not.toMatch(/esperando transportista/i);
      expect(detalle).not.toMatch(/ya la pueden ver/i);
    }
  });

  it('pendiente: no ofrece asignar; pide cambiar la fecha o cancelar', () => {
    const textos = textosRetiroVencido('pendiente', '25/09/2026');
    expect(textos.titulo).toBe('Retiro vencido, con camioneros postulados');
    expect(textos.aviso).toContain('no se puede asignar: cambiale la fecha o cancelala.');
    expect(textos.detalle).toContain('primero cambiale la fecha de retiro');
    expect(textos.aviso).not.toMatch(/asignásela/i);
  });

  it('en los demás estados no hay textos de retiro vencido', () => {
    for (const estado of ['aceptada', 'en_viaje', 'entregada', 'cancelada']) {
      expect(textosRetiroVencido(estado, '25/09/2026')).toBeNull();
    }
  });
});
