// Telefonos argentinos. Esto es solo para avisarle a la persona
// mientras escribe: la validacion que manda es la del servidor,
// en src/telefono.js del backend.

// Deja solo el numero local: sin el 54 del pais, sin el 9 de los
// celulares, sin el 0 de larga distancia y sin el 15 del abonado.
const soloLocal = (valor) => {
  let d = String(valor || "").replace(/\D/g, "");

  if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("9")) d = d.slice(1);
  if (d.startsWith("0")) d = d.slice(1);

  // El 15 va despues del codigo de area, que puede tener 2, 3 o 4
  // digitos segun la zona: 11 en Buenos Aires, 351 en Cordoba.
  if (d.length > 10) {
    for (const pos of [2, 3, 4]) {
      if (d.slice(pos, pos + 2) === "15" && d.length - 2 === 10) {
        d = d.slice(0, pos) + d.slice(pos + 2);
        break;
      }
    }
  }

  return d;
};

// Formato que espera WhatsApp: 549 + los 10 digitos locales.
export const normalizarTelefono = (valor) => "549" + soloLocal(valor);

// En Argentina el numero local siempre suma 10 digitos entre el codigo
// de area y el abonado. Ni 8 ni 12: diez.
export const telefonoParece = (valor) => soloLocal(valor).length === 10;

// Cuantos digitos faltan o sobran, para poder decirlo con precision.
export const digitosLocales = (valor) => soloLocal(valor).length;
