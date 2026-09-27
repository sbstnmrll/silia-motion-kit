#!/usr/bin/env bash
# verificar-entrega.sh — las compuertas de entrega que sí se pueden medir, sobre el MP4 final.
#
# Generalizado desde el único script de compuertas que existía en el repo
# (silia-university/02-agentes-especializados-AE/ae/verificar.sh), que imprimía
# números para que una persona los leyera. Éste **afirma**: sale 1 si algo no
# cumple, y escribe las líneas RESULTADO ya listas para pegar en GATES.md.
#
# La diferencia importa. AUDITORIA.md de no-sabias-agente: "Fallo de mi compuerta
# G5: verificó alineación con un umbral de −40 dB y pasó; nunca verificó nivel.
# Una compuerta de audio sin objetivo de LUFS no sirve." Un script que imprime y
# siempre sale 0 es esa misma compuerta.
#
# Uso:
#   verificar-entrega.sh <archivo.mp4> [opciones]
#     --fps 60            fps exacto esperado (60.000, no 59.94)
#     --size 1080x1920    resolución esperada
#     --dur 40.233        duración esperada en segundos (tolerancia ±0.05)
#     --lufs -14          objetivo de sonoridad integrada (tolerancia ±0.5)
#     --tp -1.0           true peak máximo en dBTP
#     --outro-negro 0.467 negro de relleno mínimo antes del outro, en segundos
#                         (= cruce − negro propio del outro; ver motion://hechos-medidos)
#     --frames "t1 t2 …"  tiempos en segundos a extraer y montar en tira de contacto
#     --out work/qa/vN    dónde dejar los frames y la tira (por defecto junto al MP4)
#
# Lo que NO hace: mirar. La tira de contacto se genera para que alguien la mire;
# "un render que corrió bien no es evidencia de nada".

set -uo pipefail

F=""; FPS=""; SIZE=""; DUR=""; LUFS=""; TP=""; OUTRO_NEGRO=""; FRAMES=""; OUT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --fps) FPS="$2"; shift 2;;
    --size) SIZE="$2"; shift 2;;
    --dur) DUR="$2"; shift 2;;
    --lufs) LUFS="$2"; shift 2;;
    --tp) TP="$2"; shift 2;;
    --outro-negro) OUTRO_NEGRO="$2"; shift 2;;
    --frames) FRAMES="$2"; shift 2;;
    --out) OUT="$2"; shift 2;;
    -*) echo "opción desconocida: $1" >&2; exit 2;;
    *) F="$1"; shift;;
  esac
done

[ -n "$F" ] || { echo "falta el archivo: verificar-entrega.sh <archivo.mp4> [opciones]" >&2; exit 2; }
[ -f "$F" ] || { echo "no existe: $F" >&2; exit 2; }
OUT="${OUT:-$(dirname "$F")/qa}"
mkdir -p "$OUT"

FAIL=0
ok()   { printf '  ✅ %s\n' "$1"; }
bad()  { printf '  ⛔ %s\n' "$1"; FAIL=1; }
near() { awk -v a="$1" -v b="$2" -v t="$3" 'BEGIN{d=a-b; if(d<0)d=-d; exit !(d<=t)}'; }

echo "== $F"

# ---- stream -----------------------------------------------------------------
# ffprobe separa los campos por comas, no por espacios: hay que fijar IFS o se
# lee la línea entera como un solo campo (y el fps sale vacío, y la compuerta
# "falla" por un motivo que no es el real).
IFS=',' read -r W H RFR NB <<EOF
$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,nb_frames -of csv=p=0 "$F")
EOF
DURACION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$F")
FPS_REAL=$(awk -v r="$RFR" 'BEGIN{split(r,a,"/"); if(a[2]+0==0){print "0"; exit} printf "%.3f", a[1]/a[2]}')
echo "stream: ${W}x${H} · ${FPS_REAL} fps · ${NB} frames · ${DURACION} s"

if [ -n "$SIZE" ]; then
  [ "${W}x${H}" = "$SIZE" ] && ok "resolución ${W}x${H}" || bad "resolución ${W}x${H}, se esperaba $SIZE"
fi
if [ -n "$FPS" ]; then
  near "$FPS_REAL" "$FPS" 0.01 && ok "fps ${FPS_REAL}" || bad "fps ${FPS_REAL}, se esperaba ${FPS} (±0.01) — 59.94 no es 60.000"
fi
if [ -n "$DUR" ]; then
  near "$DURACION" "$DUR" 0.05 && ok "duración ${DURACION} s" || bad "duración ${DURACION} s, se esperaba ${DUR} (±0.05)"
fi

# ---- sonoridad ---------------------------------------------------------------
if [ -n "$LUFS" ] || [ -n "$TP" ]; then
  EBU=$(ffmpeg -nostats -i "$F" -filter_complex ebur128=peak=true -f null - 2>&1 | tail -30)
  I=$(echo "$EBU"  | grep -E '^\s*I:' | tail -1 | awk '{print $2}')
  PK=$(echo "$EBU" | grep -E '^\s*Peak:' | tail -1 | awk '{print $2}')
  echo "audio: ${I:-n/d} LUFS · true peak ${PK:-n/d} dBTP"
  if [ -n "$LUFS" ]; then
    if [ -z "$I" ]; then bad "no se pudo medir LUFS (¿el archivo tiene audio?)"
    elif near "$I" "$LUFS" 0.5; then ok "sonoridad ${I} LUFS dentro de ${LUFS} ±0.5"
    else bad "sonoridad ${I} LUFS fuera de ${LUFS} ±0.5"; fi
  fi
  if [ -n "$TP" ]; then
    if [ -z "$PK" ]; then bad "no se pudo medir true peak"
    elif awk -v p="$PK" -v t="$TP" 'BEGIN{exit !(p<=t)}'; then ok "true peak ${PK} ≤ ${TP} dBTP"
    else bad "true peak ${PK} por encima de ${TP} dBTP"; fi
  fi
fi

# ---- negro antes del outro ---------------------------------------------------
# Se mide el negro del final, que es el que tiene que cubrir el cruce del outro.
if [ -n "$OUTRO_NEGRO" ]; then
  BD=$(ffmpeg -nostats -i "$F" -vf "blackdetect=d=0.05:pix_th=0.10" -f null - 2>&1 | grep black_start || true)
  ULT=$(echo "$BD" | tail -1)
  if [ -z "$ULT" ]; then
    bad "no se detectó ningún tramo de negro; el cruce del outro se hará sobre la última imagen de la pieza"
  else
    DURN=$(echo "$ULT" | sed -n 's/.*black_duration:\([0-9.]*\).*/\1/p')
    INI=$(echo "$ULT" | sed -n 's/.*black_start:\([0-9.]*\).*/\1/p')
    echo "negro: último tramo en ${INI} s, ${DURN} s"
    if awk -v d="$DURN" -v m="$OUTRO_NEGRO" 'BEGIN{exit !(d>=m)}'; then ok "negro ${DURN} s ≥ ${OUTRO_NEGRO} s"
    else bad "negro ${DURN} s < ${OUTRO_NEGRO} s — el último cuadro se verá bajo el logo"; fi
  fi
fi

# ---- tira de contacto --------------------------------------------------------
# Seek de SALIDA (-i antes de -ss): con seek de entrada ffmpeg devuelve el cuadro
# clave anterior, así que la tira muestra contenido de ANTES del tiempo pedido.
if [ -n "$FRAMES" ]; then
  rm -f "$OUT"/g_*.png
  N=0
  for t in $FRAMES; do
    ffmpeg -v error -y -i "$F" -ss "$t" -frames:v 1 "$OUT/g_$(printf '%08.3f' "$t").png" && N=$((N+1))
  done
  COLS=$(awk -v n="$N" 'BEGIN{c=int(sqrt(n)+0.999); if(c<1)c=1; print c}')
  ROWS=$(awk -v n="$N" -v c="$COLS" 'BEGIN{print int((n+c-1)/c)}')
  ffmpeg -v error -y -pattern_type glob -i "$OUT/g_*.png" -vf "scale=270:-1,tile=${COLS}x${ROWS}:padding=4:color=black" "$OUT/tira.png" \
    && echo "tira: $OUT/tira.png ($N frames, ${COLS}x${ROWS}) — MÍRALA, no basta con que el comando haya salido bien"
fi

echo
if [ "$FAIL" = 0 ]; then
  echo "RESULTADO: cumplido. ${W}x${H}, ${FPS_REAL} fps, ${NB} frames, ${DURACION} s${I:+, ${I} LUFS}${PK:+, TP ${PK}}"
else
  echo "RESULTADO: NO cumplido — ver los ⛔ de arriba."
fi
exit $FAIL
