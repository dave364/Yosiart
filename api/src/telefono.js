// Telefonos argentinos, en un solo lugar.
// El frontend tiene una copia de estas reglas para avisar al toque,
// pero la que decide es esta: el cliente puede saltearse el formulario.

// Deja solo el numero local: sin el 54 del pais, sin el 9 de los
// celulares, sin el 0 de larga distancia y sin el 15 del abonado.
export function soloLocal(valor) {
  let d = String(valor || "").replace(/\D/g, "");

  if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("9")) d = d.slice(1);
  if (d.startsWith("0")) d = d.slice(1);

  // El 15 va despues del codigo de area, que puede tener 2, 3 o 4
  // digitos segun la zona: 11 en Buenos Aires, 351 en Cordoba,
  // 2966 en Rio Gallegos.
  if (d.length > 10) {
    for (const pos of [2, 3, 4]) {
      if (d.slice(pos, pos + 2) === "15" && d.length - 2 === 10) {
        d = d.slice(0, pos) + d.slice(pos + 2);
        break;
      }
    }
  }

  return d;
}

// En Argentina el numero local siempre suma 10 digitos entre el codigo
// de area y el abonado. Ni 8 ni 12: diez.
export function telefonoValido(valor) {
  return soloLocal(valor).length === 10;
}

// Formato internacional de celular argentino: 549 + los 10 digitos locales.
export function normalizarTelefono(valor) {
  return "549" + soloLocal(valor);
}
