# Librería de expresiones — entradas y rangos

Canon: `src/motion/expressions.ts` (rutas relativas al repo del MCP); `ae_expression action=library_info [library=<nombre>]` describe params, defaults, rangos y el texto rellenado sin tocar AE. Uso: `ae_expression action=set layer=<l> path=<p> library=<nombre> params={…}` (los params fuera de rango se aplican pero devuelven `warnings`). Todo es ES3 y corre en ambos motores de expresiones. Patrones de inertia/bounce/spring/typewriter/counter según LobzyJay/motion-design-with-claude (MIT) y Dan Ebberts; `ekeys_style` / `ebox_*` siguen los conceptos de eKeys/eBox (motiondeveloper, MIT). Texto reescrito.

| Nombre | Para | Params (default · rango) | Cuándo |
|---|---|---|---|
| `inertia` | position, scale, rotation con keys | `amp` 0.08 · 0.04–0.12 · `freq` 3 · 2–4 Hz · `decay` 6 · 4–8 | overshoot tras cada key (seno amortiguado). Sustituye a `ease_out_back`. Premium: amp ≤ 0.06 o ninguno |
| `bounce` | position, scale | `amp` 0.08 · 0.04–0.12 · `freq` 3 · 2–4 · `decay` 6 · 4–8 | como inertia pero siempre al mismo lado (\|sin\|): aterriza y rebota |
| `bounce_physics` | position | `elasticity` 0.7 · 0.3–0.9 · `gravity` 5000 · 1000–20000 px/s² · `max_bounces` 9 · 1–20 | rebote físico tras el último key (patrón Ebberts) |
| `spring` | position, scale, rotation | `amp` 0.1 · 0.05–0.2 · `freq` 2 · 1–4 · `decay` 3 · 2–6 | oscilación más suave y lenta que inertia; UI con bounce ≤ 0.1 → amp ≤ 0.1 |
| `wiggle_drift` | position, rotation, scale | `freq` 0.5 · 0.2–1 Hz · `amp` 8 · 2–30 px | vida ambiente en stills y orbes (0.5 Hz / 8 px) |
| `wiggle_jitter` | position, rotation | `freq` 24 · 10–60 Hz · `amp` 2 · 0.5–8 px | cámara en mano / glitch (24 Hz / 2 px) |
| `wiggle` · `wiggle_slow` | cualquiera | `freq` 2 / 0.5 · `amp` 30 / 10 | legado; preferir drift/jitter |
| `loop_cycle` · `loop_pingpong` · `loop_offset` · `loop_in_cycle` | propiedad con keys | `keyframes` 0 · 0–50 (segmentos; 0 = todos) | repetir / ida-vuelta / acumulando delta / hacia atrás antes del 1er key |
| `loop_continue` | propiedad con keys | — | sigue a la velocidad del último key |
| `time_offset` | cualquier propiedad con keys copiadas a N capas | `delay` 0.06 · 0.02–0.2 s · `base_index` 1 | stagger gratis por índice de capa |
| `ekeys_style` | cualquiera | `start` 0 · `duration` 0.5 · 0.05–10 · `from` 0 · `to` 100 · `curve` ease \| linear \| easeIn \| easeOut | keys inline editables como números; `from`/`to` con la arity de la propiedad |
| `ebox_responsive` | Rect Size de una forma | `target` (capa de texto) · `padding` 24 · 0–400 | caja que sigue los bounds del texto; pareja de `ebox_center` |
| `ebox_center` | Rect Position | `target` | centra la caja en el texto (forma en origen con transform por defecto) |
| `typewriter` | Source Text | `cps` 20 · 4–80 · `delay` 0 · 0–10 s | revelar por caracteres desde el in-point |
| `counter` | Source Text + Slider en la misma capa | `slider` "Slider Control" · `decimals` 0 · 0–6 · `separator` "," · `prefix` · `suffix` | formatea un slider animado (animar el slider, no el texto) |
| `link_position` · `follow_with_delay` | position | `target` · `delay` 0.1 · 0–2 s | seguir a otra capa (con retardo) |
| `posterize_12` | cualquiera | `fps` 12 · 1–30 | stop-motion |
| `text_bounds_width` | 1D en capa de texto | — | largo de subrayados/cajas |
| `time_seconds_counter` | Source Text | `suffix` "s" | segundos transcurridos |
| `auto_fade_in_out` | opacity | `fade_in` 0.5 · `fade_out` 0.5 · 0–5 s | fundido automático por in/out de capa |
| `slider_driven` | 1D | `slider` | propiedad gobernada por slider |

## Cuándo expresión y cuándo keyframes

- Overshoot/rebote: **expresión** (`inertia` / `spring`), porque back/elastic/bounce no caben en un KeyframeEase. Premium casi nunca.
- Stagger de muchas capas iguales: `time_offset` en todas (una expresión) o `ae_keyframes action=offset` por capa (más explícito para el critique, que lee keys, no expresiones).
- Contadores: slider + `counter`; la rúbrica permite lineal en `visualization`.
- Letra por letra sincronizada con audio: **keys HOLD de source text** (`ae_text action=set_keyframes`), no `typewriter`, para caer en frame exacto.
- Validar siempre: `ae_expression action=validate` (dry-run con `eval_at`) y `action=validate_all scope=comp` antes de renderizar. El `keyframe_dump` de `critique` **no ve expresiones**: lo que animes por expresión se juzga solo en las imágenes.
