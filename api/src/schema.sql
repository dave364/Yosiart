-- YosiArt API - esquema de base de datos (PostgreSQL)
-- Se puede correr las veces que haga falta: todo usa IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS usuarios (
  id                  SERIAL PRIMARY KEY,
  email               TEXT UNIQUE NOT NULL,
  telefono            TEXT NOT NULL,
  password_hash       TEXT NOT NULL,
  nombre              TEXT NOT NULL,
  rol                 TEXT NOT NULL DEFAULT 'cliente'
                      CHECK (rol IN ('cliente', 'admin')),
  activo              BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cada producto es un "tipo de pieza" que el cliente personaliza.
-- Las opciones viven en columnas JSONB porque cambian de una pieza a otra:
--   formas          ["hueso","circulo",...]  formas entre las que se elige (vacio = solo `forma`)
--   tamanos         {"hueso":[{"id":"grande","nombre":"Grande","cm":6}, ...], ...}
--   lleva           {"nombre":true,"telefono":true,"telefonoAtras":true,"foto":false}
--   precios_tamano  {"grande": 4500, "hueso:chico": 3800}  precio por tamaño (opcional)
-- precio NULL = "precio a confirmar": el pedido entra igual y Yosi lo cotiza.
CREATE TABLE IF NOT EXISTS productos (
  id              SERIAL PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,
  nombre          TEXT NOT NULL,
  categoria       TEXT NOT NULL,
  descripcion     TEXT NOT NULL DEFAULT '',
  precio          NUMERIC(12,2) CHECK (precio >= 0),
  precios_tamano  JSONB NOT NULL DEFAULT '{}',
  forma           TEXT NOT NULL,
  formas          JSONB NOT NULL DEFAULT '[]',
  tamanos         JSONB NOT NULL DEFAULT '{}',
  lleva           JSONB NOT NULL DEFAULT '{"nombre":true}',
  nuevo           BOOLEAN NOT NULL DEFAULT FALSE,
  orden           INTEGER NOT NULL DEFAULT 0,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Estados del pedido, en el orden en que avanza:
--   pendiente -> confirmado -> en_preparacion -> listo -> enviado -> entregado
-- y cancelado en cualquier momento.
CREATE TABLE IF NOT EXISTS pedidos (
  id                SERIAL PRIMARY KEY,
  numero            TEXT UNIQUE NOT NULL,
  -- NULL = compra como invitado
  usuario_id        INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  cliente_nombre    TEXT NOT NULL,
  cliente_email     TEXT NOT NULL,
  cliente_telefono  TEXT NOT NULL,
  estado            TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente','confirmado','en_preparacion','listo',
                                      'enviado','entregado','cancelado')),
  -- NULL mientras alguna pieza tenga el precio a confirmar.
  total             NUMERIC(12,2),
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedido_items (
  id               SERIAL PRIMARY KEY,
  pedido_id        INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id      INTEGER REFERENCES productos(id) ON DELETE SET NULL,
  -- Copias del momento de la compra: si el producto cambia de precio
  -- o de nombre despues, el historial del pedido no se altera.
  nombre_producto  TEXT NOT NULL,
  precio_unitario  NUMERIC(12,2),
  cantidad         INTEGER NOT NULL CHECK (cantidad > 0),
  -- forma, tamaño, color, glitter, nombre, telefono, lado del telefono, foto
  personalizacion  JSONB NOT NULL DEFAULT '{}'
);

-- Cada cambio de estado queda registrado: es lo que ve el cliente
-- en el seguimiento ("Recibido el 14/10, en preparacion el 15/10...").
CREATE TABLE IF NOT EXISTS pedido_historial (
  id          SERIAL PRIMARY KEY,
  pedido_id   INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  estado      TEXT NOT NULL,
  nota        TEXT,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Secuencia para los numeros de pedido legibles (#0001, #0002...)
CREATE SEQUENCE IF NOT EXISTS pedido_numero_seq START 1;

-- Fotos que suben los clientes (la de la mascota para el llavero, las
-- referencias de un presupuesto). Se guardan en la base para no depender
-- de otro servicio al arrancar; el id es aleatorio y largo, asi que no
-- se pueden adivinar las fotos de otros pedidos.
CREATE TABLE IF NOT EXISTS fotos (
  id          TEXT PRIMARY KEY,
  mime        TEXT NOT NULL,
  datos       BYTEA NOT NULL,
  bytes       INTEGER NOT NULL,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pedidos de presupuesto: piezas a medida y souvenirs.
CREATE TABLE IF NOT EXISTS presupuestos (
  id            SERIAL PRIMARY KEY,
  usuario_id    INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  nombre        TEXT NOT NULL,
  email         TEXT NOT NULL,
  telefono      TEXT,
  tipo          TEXT NOT NULL,
  cantidad      INTEGER,
  fecha_evento  DATE,
  descripcion   TEXT NOT NULL,
  fotos         JSONB NOT NULL DEFAULT '[]',
  estado        TEXT NOT NULL DEFAULT 'nuevo'
                CHECK (estado IN ('nuevo','respondido','aceptado','rechazado')),
  respuesta     TEXT,
  precio        NUMERIC(12,2),
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pedidos de cambio de contrasena.
-- Guardamos el hash del token y no el token: si alguien llegara a leer
-- la tabla, no podria usar los enlaces que estan dando vueltas.
CREATE TABLE IF NOT EXISTS reset_tokens (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash  TEXT UNIQUE NOT NULL,
  expira_en   TIMESTAMPTZ NOT NULL,
  usado_en    TIMESTAMPTZ,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_productos_activo     ON productos(activo);
CREATE INDEX IF NOT EXISTS idx_pedidos_usuario      ON pedidos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado       ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_items_pedido         ON pedido_items(pedido_id);
CREATE INDEX IF NOT EXISTS idx_historial_pedido     ON pedido_historial(pedido_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_estado  ON presupuestos(estado);
CREATE INDEX IF NOT EXISTS idx_reset_token          ON reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_reset_usuario        ON reset_tokens(usuario_id);
