import { describe, expect, it } from 'vitest';
import {
  POR_PAGINA,
  cantidadDePaginas,
  elementosDePagina,
  paginaDeIndice,
  paginaDeUrl,
  rangoDePagina,
} from '../src/utils/paginacion';

describe('paginaDeUrl', () => {
  it('lee un entero positivo', () => {
    expect(paginaDeUrl(new URLSearchParams('pagina=3'))).toBe(3);
  });

  it('cualquier otra cosa es la primera página', () => {
    for (const consulta of ['', 'pagina=', 'pagina=0', 'pagina=-2', 'pagina=dos', 'pagina=1.5']) {
      expect(paginaDeUrl(new URLSearchParams(consulta)), consulta).toBe(1);
    }
  });
});

describe('cantidadDePaginas', () => {
  it('redondea para arriba', () => {
    expect(cantidadDePaginas(20)).toBe(1);
    expect(cantidadDePaginas(21)).toBe(2);
    expect(cantidadDePaginas(86)).toBe(5);
  });

  it('sin elementos hay una página, no cero', () => {
    expect(cantidadDePaginas(0)).toBe(1);
  });
});

describe('rangoDePagina', () => {
  it('una página del medio y la última, incompleta', () => {
    expect(rangoDePagina(2, 86)).toEqual({ desde: 21, hasta: 40 });
    expect(rangoDePagina(5, 86)).toEqual({ desde: 81, hasta: 86 });
  });

  it('sin elementos, 0 a 0', () => {
    expect(rangoDePagina(1, 0)).toEqual({ desde: 0, hasta: 0 });
  });
});

describe('elementosDePagina', () => {
  const lista = Array.from({ length: 45 }, (_, indice) => indice + 1);

  it('corta de a POR_PAGINA', () => {
    expect(POR_PAGINA).toBe(20);
    expect(elementosDePagina(lista, 1)).toEqual(lista.slice(0, 20));
    expect(elementosDePagina(lista, 3)).toEqual([41, 42, 43, 44, 45]);
  });

  it('una página que no existe viene vacía', () => {
    expect(elementosDePagina(lista, 4)).toEqual([]);
  });
});

describe('paginaDeIndice', () => {
  it('ubica la posición en su página', () => {
    expect(paginaDeIndice(0)).toBe(1);
    expect(paginaDeIndice(19)).toBe(1);
    expect(paginaDeIndice(20)).toBe(2);
  });
});
