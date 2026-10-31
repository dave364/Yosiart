// Achica la foto que sube el cliente antes de guardarla en el carrito.
// Una foto de celular pesa varios MB y no entra en localStorage. A 800px
// queda en ~100 KB: entra en el carrito y alcanza para hacer la pieza.
// Al confirmar el pedido viaja a la API, que la guarda (api/src/fotos.js).

const LADO_MAX = 800;
const CALIDAD = 0.82;
export const MAX_MB = 10;

export const achicarFoto = (archivo: File) =>
  new Promise<string>((resolve, reject) => {
    if (!archivo.type.startsWith("image/")) {
      reject(new Error("El archivo tiene que ser una imagen."));
      return;
    }
    if (archivo.size > MAX_MB * 1024 * 1024) {
      reject(new Error(`La foto pesa más de ${MAX_MB} MB.`));
      return;
    }

    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, LADO_MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", CALIDAD));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No pudimos leer la foto. Probá con otra."));
    };
    img.src = url;
  });
