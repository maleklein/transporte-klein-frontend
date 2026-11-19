import { describe, expect, it } from 'vitest';
import {
  avisoSinResultados,
  coincideBusqueda,
  datoQueCoincide,
  normalizarBusqueda,
  tramosResaltados,
} from '../src/utils/buscarUsuarios';

// Los mismos usuarios que usa el banco de pruebas de la HU 1.3.
const CARLOS = { nombre: 'Carlos', apellido: 'Gauto', dni: '46604678', email: 'carlos.gauto@klein.com' };
const CARLA = { nombre: 'Carla', apellido: 'Romero', dni: '31234567', email: 'carla.romero@klein.com' };
const LAURA = { nombre: 'Laura', apellido: 'Gómez', dni: '28999111', email: 'laura.gomez@klein.com' };
const JORGE = { nombre: 'Jorge', apellido: 'Benítez', dni: '21234000', email: 'jorge.benitez@klein.com' };
const USUARIOS = [CARLOS, CARLA, LAURA, JORGE];

/** Nombres de los usuarios que encuentra una búsqueda, en orden. */
const buscar = (texto) =>
  USUARIOS.filter((usuario) => coincideBusqueda(usuario, texto)).map(
    (usuario) => `${usuario.nombre} ${usuario.apellido}`,
  );

/** Las partes resaltadas de un texto, para comparar fácil. */
const resaltado = (texto, busqueda) =>
  tramosResaltados(texto, busqueda)
    .filter((tramo) => tramo.coincide)
    .map((tramo) => tramo.texto);

describe('normalizarBusqueda', () => {
  it('pasa a minúscula, saca las tildes y recorta los espacios', () => {
    expect(normalizarBusqueda('  José PÉREZ  ')).toBe('jose perez');
  });

  it('acepta valores vacíos o que no son texto', () => {
    expect(normalizarBusqueda(undefined)).toBe('');
    expect(normalizarBusqueda(null)).toBe('');
    expect(normalizarBusqueda(46604678)).toBe('46604678');
  });
});

describe('coincideBusqueda', () => {
  it('con el campo vacío o solo con espacios, coinciden todos', () => {
    expect(buscar('')).toHaveLength(4);
    expect(buscar('   ')).toHaveLength(4);
  });

  it('busca por parte del nombre', () => {
    expect(buscar('car')).toEqual(['Carlos Gauto', 'Carla Romero']);
  });

  it('busca en el apellido', () => {
    expect(buscar('Gauto')).toEqual(['Carlos Gauto']);
  });

  it('no distingue mayúsculas', () => {
    expect(buscar('CARLOS')).toEqual(['Carlos Gauto']);
  });

  it('no distingue tildes, ni en lo escrito ni en el nombre', () => {
    expect(buscar('gomez')).toEqual(['Laura Gómez']);
    expect(buscar('Benítez')).toEqual(['Jorge Benítez']);
  });

  it('busca por DNI completo o por una parte', () => {
    expect(buscar('46604678')).toEqual(['Carlos Gauto']);
    expect(buscar('123')).toEqual(['Carla Romero', 'Jorge Benítez']);
  });

  it('acepta el DNI escrito con puntos', () => {
    expect(buscar('46.604.678')).toEqual(['Carlos Gauto']);
  });

  it('busca en el email', () => {
    expect(buscar('gauto@')).toEqual(['Carlos Gauto']);
    expect(buscar('romero@klein')).toEqual(['Carla Romero']);
  });

  it('con varias palabras, todas tienen que aparecer, en cualquier orden', () => {
    expect(buscar('carlos gauto')).toEqual(['Carlos Gauto']);
    expect(buscar('gauto carlos')).toEqual(['Carlos Gauto']);
    expect(buscar('carla 123')).toEqual(['Carla Romero']);
    expect(buscar('carlos romero')).toEqual([]);
  });

  it('una palabra no coincide pegando el final de un dato con el principio de otro', () => {
    // "gauto4660" uniría el apellido con el DNI.
    expect(buscar('gauto4660')).toEqual([]);
  });

  it('sin coincidencias, no encuentra a nadie', () => {
    expect(buscar('zzz')).toEqual([]);
    expect(buscar('99999999')).toEqual([]);
  });

  it('acepta usuarios sin email o con el DNI como número', () => {
    expect(coincideBusqueda({ nombre: 'Ana', apellido: 'Suárez', dni: 33444555 }, '334')).toBe(true);
  });
});

describe('datoQueCoincide', () => {
  it('sin búsqueda, o si coincide por el nombre, no agrega nada', () => {
    expect(datoQueCoincide(CARLOS, '')).toBeNull();
    expect(datoQueCoincide(CARLOS, 'gauto')).toBeNull();
    expect(datoQueCoincide(CARLOS, 'Carlos Gauto')).toBeNull();
  });

  it('si coincide por el DNI, con o sin puntos, dice "dni"', () => {
    expect(datoQueCoincide(CARLOS, '466')).toBe('dni');
    expect(datoQueCoincide(CARLOS, '46.604.678')).toBe('dni');
  });

  it('si coincide por el email, dice "email"', () => {
    expect(datoQueCoincide(CARLOS, '@klein')).toBe('email');
  });

  it('con nombre y DNI mezclados, dice "dni"', () => {
    expect(datoQueCoincide(CARLA, 'carla 123')).toBe('dni');
  });

  it('una palabra que está en el nombre y en el email cuenta como nombre', () => {
    expect(datoQueCoincide(CARLA, 'romero')).toBeNull();
  });
});

describe('tramosResaltados', () => {
  it('marca la parte que coincide y conserva el texto original', () => {
    expect(tramosResaltados('Carla Romero', 'carla')).toEqual([
      { texto: 'Carla', coincide: true },
      { texto: ' Romero', coincide: false },
    ]);
  });

  it('juntos, los tramos forman el texto completo', () => {
    const tramos = tramosResaltados('Laura Gómez', 'gom');
    expect(tramos.map((tramo) => tramo.texto).join('')).toBe('Laura Gómez');
  });

  it('marca con tilde aunque se haya escrito sin', () => {
    expect(resaltado('Laura Gómez', 'gomez')).toEqual(['Gómez']);
  });

  it('marca cada palabra de la búsqueda donde aparezca', () => {
    expect(resaltado('Carlos Gauto', 'gauto car')).toEqual(['Car', 'Gauto']);
    expect(resaltado('31234567', 'carla 123')).toEqual(['123']);
  });

  it('marca el DNI aunque se haya escrito con puntos', () => {
    expect(resaltado('46604678', '46.604')).toEqual(['46604']);
  });

  it('marca el DNI mostrado con puntos, se busque con puntos o sin', () => {
    expect(resaltado('46.604.678', '46604')).toEqual(['46.604']);
    expect(resaltado('46.604.678', '46.604')).toEqual(['46.604']);
    expect(resaltado('46.604.678', '6046')).toEqual(['604.6']);
  });

  it('un punto que no está entre dígitos se busca como cualquier letra', () => {
    expect(resaltado('carla.romero@klein.com', 'carla.romero')).toEqual(['carla.romero']);
  });

  it('marca todas las veces que aparece', () => {
    expect(resaltado('Ana Mariana', 'ana')).toEqual(['Ana', 'ana']);
  });

  it('si dos apariciones se pisan, las marca juntas', () => {
    // En "Banana", "ana" aparece en "Ban[ana]" y "Ban[an[a]na]": queda un solo tramo.
    expect(resaltado('Banana', 'ana')).toEqual(['anana']);
  });

  it('sin búsqueda, o sin coincidencias, devuelve el texto entero sin marcar', () => {
    expect(tramosResaltados('Carla Romero', '')).toEqual([{ texto: 'Carla Romero', coincide: false }]);
    expect(resaltado('Carla Romero', 'zzz')).toEqual([]);
  });

  it('acepta un texto vacío', () => {
    expect(tramosResaltados('', 'carla')).toEqual([{ texto: '', coincide: false }]);
  });
});

describe('avisoSinResultados', () => {
  it('solo búsqueda: dice qué se buscó y sugiere revisarlo', () => {
    expect(avisoSinResultados({ busqueda: 'zzz', rol: '', estado: '', coincidenSinFiltros: 0 })).toEqual({
      titulo: 'No hay usuarios que coincidan con “zzz”.',
      ayuda: 'Revisá cómo está escrito o buscá por una parte del nombre, del apellido, del DNI o del correo electrónico.',
    });
  });

  it('búsqueda que el rol deja afuera: dice cuántos hay sin ese filtro', () => {
    expect(
      avisoSinResultados({ busqueda: 'carla', rol: 'camionero', estado: '', coincidenSinFiltros: 1 }),
    ).toEqual({
      titulo: 'No hay camioneros que coincidan con “carla”.',
      ayuda: 'Si sacás el filtro de rol, hay 1 usuario que coincide.',
    });
  });

  it('búsqueda que el estado deja afuera', () => {
    expect(
      avisoSinResultados({ busqueda: 'car', rol: '', estado: 'inactivo', coincidenSinFiltros: 2 }),
    ).toEqual({
      titulo: 'No hay usuarios inactivos que coincidan con “car”.',
      ayuda: 'Si sacás el filtro de estado, hay 2 usuarios que coinciden.',
    });
  });

  it('búsqueda que rol y estado juntos dejan afuera', () => {
    expect(
      avisoSinResultados({ busqueda: 'car', rol: 'camionero', estado: 'inactivo', coincidenSinFiltros: 2 }),
    ).toEqual({
      titulo: 'No hay camioneros inactivos que coincidan con “car”.',
      ayuda: 'Si sacás los filtros de rol y estado, hay 2 usuarios que coinciden.',
    });
  });

  it('búsqueda sin coincidencias aunque haya rol: el problema es lo escrito', () => {
    expect(
      avisoSinResultados({ busqueda: 'zzz', rol: 'camionero', estado: '', coincidenSinFiltros: 0 }).titulo,
    ).toBe('No hay usuarios que coincidan con “zzz”.');
  });

  it('solo rol y estado, sin búsqueda', () => {
    expect(avisoSinResultados({ busqueda: '', rol: 'camionero', estado: 'inactivo', coincidenSinFiltros: 4 })).toEqual({
      titulo: 'No hay camioneros inactivos.',
      ayuda: 'Probá con otro rol o estado.',
    });
    expect(avisoSinResultados({ busqueda: '', rol: '', estado: 'inactivo', coincidenSinFiltros: 4 })).toEqual({
      titulo: 'No hay usuarios inactivos.',
      ayuda: 'Probá con otro estado.',
    });
    expect(avisoSinResultados({ busqueda: '', rol: 'administrador', estado: '', coincidenSinFiltros: 4 })).toEqual({
      titulo: 'No hay administradores.',
      ayuda: 'Probá con otro rol.',
    });
  });
});
