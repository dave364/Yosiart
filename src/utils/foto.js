// Achica la foto que sube el cliente antes de guardarla en el carrito.
// Una foto de celular pesa varios MB y no entra en localStorage; para la
// vista previa alcanza con ~400px. La foto original se va a subir a
// Cloudinary cuando este el backend (TODO).

const LADO_MAX = 400;
const CALIDAD = 0.82;
export const MAX_MB = 10;

export const achicarFoto = (archivo) =>
  new Promise((resolve, reject) => {
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
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", CALIDAD));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No pudimos leer la foto. Probá con otra."));
    };
    img.src = url;
  });
