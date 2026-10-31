// Arranque en Node (tu PC: npm run dev).
// En Cloudflare la API arranca desde worker/index.js.
import "dotenv/config";
import { PORT } from "./config.ts";
import { app } from "./app.ts";

app.listen(PORT, () => {
  console.log(`YosiArt API escuchando en el puerto ${PORT}`);
});
