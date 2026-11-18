import { describe, expect, it } from 'vitest';
import { editarDni, formatearDni } from '../src/utils/formatoUsuario';

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

describe('editarDni', () => {
  it('pone los puntos mientras se escribe y deja el cursor al final', () => {
    // Había "4.516" y se tipeó un 8 al final.
    expect(editarDni({ texto: '4.5168', cursor: 6, digitosPrevios: '4516' })).toEqual({
      digitos: '45168',
      texto: '45.168',
      cursor: 6,
    });
  });

  it('el cursor queda después del mismo dígito si se escribe en el medio', () => {
    // "45.168" con el cursor después del 4, se tipea un 9: 4|9|5168.
    expect(editarDni({ texto: '495.168', cursor: 2, digitosPrevios: '45168' })).toEqual({
      digitos: '495168',
      texto: '495.168',
      cursor: 2,
    });
    // "45.168.258" con el cursor después del 1, se tipea un 0.
    expect(editarDni({ texto: '45.1068.258', cursor: 5, digitosPrevios: '45168258' })).toEqual({
      digitos: '451068258',
      texto: '451.068.258',
      cursor: 5,
    });
  });

  it('descarta lo que no es un dígito y acepta un DNI pegado con puntos', () => {
    expect(editarDni({ texto: '45.168.258', cursor: 10, digitosPrevios: '' }).digitos).toBe('45168258');
    expect(editarDni({ texto: '45a', cursor: 3, digitosPrevios: '45' })).toEqual({ digitos: '45', texto: '45', cursor: 2 });
  });

  it('borrar un dígito saca también el punto que sobra', () => {
    // "45.168" y Backspace al final: queda 4516.
    expect(editarDni({ texto: '45.16', cursor: 5, digitosPrevios: '45168', tipo: 'deleteContentBackward' })).toEqual({
      digitos: '4516',
      texto: '4.516',
      cursor: 5,
    });
  });

  it('Backspace justo después de un punto borra el dígito anterior', () => {
    // "45.|168": el navegador saca el punto y queda "45168" con el cursor en 2.
    expect(editarDni({ texto: '45168', cursor: 2, digitosPrevios: '45168', tipo: 'deleteContentBackward' })).toEqual({
      digitos: '4168',
      texto: '4.168',
      cursor: 1,
    });
  });

  it('Supr justo antes de un punto borra el dígito siguiente', () => {
    // "45|.168": el navegador saca el punto y queda "45168" con el cursor en 2.
    expect(editarDni({ texto: '45168', cursor: 2, digitosPrevios: '45168', tipo: 'deleteContentForward' })).toEqual({
      digitos: '4568',
      texto: '4.568',
      cursor: 3,
    });
  });

  it('vaciar el campo', () => {
    expect(editarDni({ texto: '', cursor: 0, digitosPrevios: '45168', tipo: 'deleteContentBackward' })).toEqual({
      digitos: '',
      texto: '',
      cursor: 0,
    });
  });
});
