// Cho Node hiểu `import "three"` trong mech/lib giống importmap của trình duyệt.
// Dùng: node --import ./tools/lib/register-three.mjs <script>
import { register } from "node:module";

const THREE_URL = new URL("../../mech/vendor/three.module.min.js", import.meta.url).href;
register(
  "data:text/javascript," +
    encodeURIComponent(
      `export async function resolve(s, c, next) {
        if (s === "three") return { url: ${JSON.stringify(THREE_URL)}, shortCircuit: true };
        return next(s, c);
      }`
    )
);
