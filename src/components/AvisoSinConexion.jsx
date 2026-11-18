import { IconoAlerta } from './Iconos';
import './AvisoSinConexion.css';

/**
 * Aviso de que una acción de un formulario no se pudo hacer por falta de
 * conexión (ver `avisoSinConexion` en `utils/conexion`). Va dentro del pie del
 * formulario, justo arriba de los botones, para que se lea al lado de lo que
 * se tocó; el formulario queda como estaba, con lo escrito.
 *
 * @param {object} props
 * @param {{titulo: string, detalle: string}|null} props.aviso - qué mostrar; null no muestra nada.
 * @returns {JSX.Element|null}
 */
export default function AvisoSinConexion({ aviso }) {
  if (!aviso) return null;
  return (
    <div className="ds-aviso ds-aviso--error asc-aviso" role="alert">
      <IconoAlerta width={22} height={22} />
      <p>
        <strong>{aviso.titulo}</strong> <span className="asc-aviso__detalle">{aviso.detalle}</span>
      </p>
    </div>
  );
}
