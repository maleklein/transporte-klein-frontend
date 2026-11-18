import { describe, expect, it } from 'vitest';
import {
  avisoSinConexion,
  esErrorDeConexion,
  esperaDeReconexion,
  textoSinConexion,
} from '../src/utils/conexion';

describe('esErrorDeConexion', () => {
  it('reconoce el error de un pedido que no llegó al servidor', () => {
    expect(esErrorDeConexion({ estado: 0, sinConexion: true })).toBe(true);
  });

  it('trata como falta de conexión los 502, 503 y 504 de Railway', () => {
    expect(esErrorDeConexion({ estado: 502 })).toBe(true);
    expect(esErrorDeConexion({ estado: 503 })).toBe(true);
    expect(esErrorDeConexion({ estado: 504 })).toBe(true);
  });

  it('no confunde otros errores con falta de conexión', () => {
    // Estado 0 sin la marca: por ejemplo, una respuesta que no se pudo leer.
    expect(esErrorDeConexion({ estado: 0 })).toBe(false);
    expect(esErrorDeConexion({ estado: 500 })).toBe(false);
    expect(esErrorDeConexion({ estado: 409 })).toBe(false);
    expect(esErrorDeConexion(new DOMException('cancelado', 'AbortError'))).toBe(false);
  });

  it('acepta valores que no son errores', () => {
    expect(esErrorDeConexion(undefined)).toBe(false);
    expect(esErrorDeConexion(null)).toBe(false);
    expect(esErrorDeConexion('sin conexión')).toBe(false);
  });
});

describe('esperaDeReconexion', () => {
  it('arranca en 5 segundos y crece al doble', () => {
    expect(esperaDeReconexion(0)).toBe(5000);
    expect(esperaDeReconexion(1)).toBe(10000);
    expect(esperaDeReconexion(2)).toBe(20000);
  });

  it('no pasa de 30 segundos', () => {
    expect(esperaDeReconexion(3)).toBe(30000);
    expect(esperaDeReconexion(10)).toBe(30000);
    expect(esperaDeReconexion(1000)).toBe(30000);
  });

  it('con un intento inválido usa la primera espera', () => {
    expect(esperaDeReconexion(-1)).toBe(5000);
    expect(esperaDeReconexion(undefined)).toBe(5000);
    expect(esperaDeReconexion(1.5)).toBe(5000);
  });
});

describe('avisoSinConexion', () => {
  it('dice qué no pasó y por qué, y qué hacer', () => {
    expect(avisoSinConexion('La carga no se canceló')).toEqual({
      titulo: 'La carga no se canceló porque no hay conexión con el sistema.',
      detalle: 'Revisá tu conexión y volvé a intentar.',
    });
  });

  it('en un formulario aclara que lo escrito se conserva', () => {
    expect(avisoSinConexion('La carga no se registró', { formulario: true })).toEqual({
      titulo: 'La carga no se registró porque no hay conexión con el sistema.',
      detalle: 'Lo que escribiste sigue acá. Revisá tu conexión y volvé a intentar.',
    });
  });

  it('textoSinConexion lo junta en un solo texto', () => {
    expect(textoSinConexion('La postulación no se envió')).toBe(
      'La postulación no se envió porque no hay conexión con el sistema. Revisá tu conexión y volvé a intentar.',
    );
  });
});
