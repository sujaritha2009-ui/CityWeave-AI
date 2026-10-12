import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { createStore } from "./store.js";

try {
  process.loadEnvFile?.();
} catch {
  // optional
}
try {
  const envPath = path.resolve(here, here.split(path.sep).includes("dist") ? "../../../backend/.env" : "../.env");
  process.loadEnvFile?.(envPath);
} catch {
  // optional
}

const port = Number(process.env.PORT) || 4000;
const here = path.dirname(fileURLToPath(import.meta.url));
// Compiled output lives in dist/backend/src, source in src; both resolve to the backend folder.
const backendRoot = path.resolve(here, here.split(path.sep).includes("dist") ? "../../.." : "..");
const dataFile = process.env.DATA_FILE || path.join(backendRoot, "data/store.json");

const app = createApp(createStore(dataFile));
app.listen(port, () => {
  console.log(`CityWeave API listening on http://localhost:${port}`);
  console.log(`Data file: ${dataFile}`);
});
