// La API vive en la misma direccion que la tienda (/api/...), asi que
// alcanza con rutas relativas. En desarrollo, Vite manda /api a la API
// local (ver vite.config.js). Para apuntar a otra API, crear un .env con:
//   VITE_API_URL=https://otra-direccion
export const API_URL = import.meta.env.VITE_API_URL || "";

export const INSTAGRAM_URL = "https://www.instagram.com/yosiart.resina/";
