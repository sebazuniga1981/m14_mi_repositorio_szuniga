const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = 3000;

const REPERTORIO_PATH = path.join(__dirname, "repertorio.json");


app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // sirve el cliente (apoyo)


const leerRepertorio = async () => {
  try {
    const data = await fs.readFile(REPERTORIO_PATH, "utf8");
    const json = data.trim() ? JSON.parse(data) : [];
    return Array.isArray(json) ? json : [];
  } catch (err) {
    // Si no existe, lo crea
    if (err.code === "ENOENT") {
      await fs.writeFile(REPERTORIO_PATH, "[]", "utf8");
      return [];
    }
    throw err;
  }
};

const guardarRepertorio = async (arr) => {
  await fs.writeFile(REPERTORIO_PATH, JSON.stringify(arr, null, 2), "utf8");
};


app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// GET /canciones -> devuelve JSON con canciones
app.get("/canciones", async (req, res) => {
  try {
    const canciones = await leerRepertorio();
    res.json(canciones);
  } catch (e) {
    res.status(500).json({ error: "Error leyendo repertorio", detalle: e.message });
  }
});

// POST /canciones -> agrega canción
app.post("/canciones", async (req, res) => {
  try {
    const { titulo, artista, tono } = req.body;

    // Validación mínima (payload)
    if (!titulo || !artista || !tono) {
      return res.status(400).json({ error: "Faltan campos: titulo, artista, tono" });
    }

    const canciones = await leerRepertorio();

    // id numérico incremental
    const maxId = canciones.reduce((max, c) => Math.max(max, Number(c.id) || 0), 0);
    const nueva = { id: maxId + 1, titulo, artista, tono };

    canciones.push(nueva);
    await guardarRepertorio(canciones);

    res.status(201).json({ message: "Canción agregada", cancion: nueva });
  } catch (e) {
    res.status(500).json({ error: "Error guardando canción", detalle: e.message });
  }
});

app.put("/canciones/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { titulo, artista, tono } = req.body;

    const canciones = await leerRepertorio();
    const idx = canciones.findIndex((c) => Number(c.id) === id);

    if (idx === -1) return res.status(404).json({ error: "Canción no encontrada" });

    canciones[idx] = {
      ...canciones[idx],
      ...(titulo !== undefined ? { titulo } : {}),
      ...(artista !== undefined ? { artista } : {}),
      ...(tono !== undefined ? { tono } : {}),
    };

    await guardarRepertorio(canciones);
    res.json({ message: "Canción actualizada", cancion: canciones[idx] });
  } catch (e) {
    res.status(500).json({ error: "Error actualizando canción", detalle: e.message });
  }
});

app.delete("/canciones/:id", async (req, res) => {
  try {
    const id = Number(req.params.id) || Number(req.query.id);

    const canciones = await leerRepertorio();
    const antes = canciones.length;
    const filtradas = canciones.filter((c) => Number(c.id) !== id);

    if (filtradas.length === antes) {
      return res.status(404).json({ error: "Canción no encontrada" });
    }

    await guardarRepertorio(filtradas);
    res.json({ message: "Canción eliminada", id });
  } catch (e) {
    res.status(500).json({ error: "Error eliminando canción", detalle: e.message });
  }
});

// Levantar servidor
app.listen(PORT, () => {
  console.log(`Servidor listo en http://localhost:${PORT}`);
});
