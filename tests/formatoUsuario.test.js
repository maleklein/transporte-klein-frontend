import { describe, expect, it } from 'vitest';
import { entradaDni, formatearDni } from '../src/utils/formatoUsuario';

describe('formatearDni', () => {
  it('separa los miles con puntos', () => {
    expect(formatearDni('45168258')).toBe('45.168.258');
    expect(formatearDni('4516825')).toBe('4.516.825');
  });

  it('acepta el DNI como número', () => {
    expect(formatearDni(31234567)).toBe('31.234.567');
  });

  it('si es más largo, se separa igual que cualquier número', () => {
    expect(formatearDni('1000000000')).toBe('1.000.000.000');
  });

  it('números cortos quedan sin puntos', () => {
    expect(formatearDni('999')).toBe('999');
  });

  it('si no son todos números, lo devuelve tal cual', () => {
    expect(formatearDni('45.168.258')).toBe('45.168.258');
    expect(formatearDni('')).toBe('');
    expect(formatearDni(null)).toBe('');
  });
});

describe('entradaDni', () => {
  it('deja lo que se escribe tal cual, sin agregar puntos', () => {
    expect(entradaDni('4516')).toEqual({ texto: '4516', digitos: '4516' });
    expect(entradaDni('45168258')).toEqual({ texto: '45168258', digitos: '45168258' });
  });

  it('acepta puntos y espacios si se escriben, y guarda solo los números', () => {
    expect(entradaDni('45.168.258')).toEqual({ texto: '45.168.258', digitos: '45168258' });
    expect(entradaDni('45 168 258')).toEqual({ texto: '45 168 258', digitos: '45168258' });
  });

  it('descarta letras y otros signos', () => {
    expect(entradaDni('45a1-6')).toEqual({ texto: '4516', digitos: '4516' });
  });

  it('vacío o nulo, vacío', () => {
    expect(entradaDni('')).toEqual({ texto: '', digitos: '' });
    expect(entradaDni(null)).toEqual({ texto: '', digitos: '' });
  });
});
