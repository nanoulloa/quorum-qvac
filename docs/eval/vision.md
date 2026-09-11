# Evaluación de VisionPsy-Nano sobre placas sintéticas

Modelo: `VISIONPSY_NANO_460M_MULTIMODAL_Q8_0` · Hardware: Apple M4 · 16 GB · 30 placas generadas con `scripts/generar-placas.py` (semilla 42).

| Campo | Acierto |
|---|---|
| Marca | 29/30 (97%) |
| Modelo | 27/30 (90%) |
| Número de serie | 28/30 (93%) |
| Fabricación | 30/30 (100%) |
| **Total** | **114/120 (95%)** |

| Variación | Acierto |
|---|---|
| limpia | 21/24 (88%) |
| rotada | 23/24 (96%) |
| desenfocada | 24/24 (100%) |
| reflejo | 23/24 (96%) |
| bajo contraste | 23/24 (96%) |

Campos marcados **Confirmado** que eran correctos: 114/115 (99%).

Latencia por placa: mediana 2280 ms (incluye la primera carga del modelo en la primera placa).
