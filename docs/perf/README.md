# Registro de rendimiento

Hardware: Apple M4 · 16 GB · Darwin 25.5.0 · Node v24.17.0 · `@qvac/sdk` 0.19.0.

Todas las inferencias corrieron en este dispositivo. 143 llamadas registradas (sesiones de prueba de humo, evaluaciones y uso de la app). Cada línea de [`perf-apple-m4.jsonl`](perf-apple-m4.jsonl) incluye modelo, cuantización, prompt, tokens de entrada y salida, tiempo al primer token, tokens por segundo, duración y backend.

| Tarea | Modelo | Cuantización | Llamadas | Carga (mín.) | Primer token (mediana) | Velocidad (mediana) | Tokens entrada | Tokens salida | Duración (mediana) |
|---|---|---|---|---|---|---|---|---|---|
| extraccion | `qwen3-1.7b` | Q4 | 77 | 1855 ms | 831 ms | 41,1 tok/s | 389 | 106 | 3740 ms |
| extraccion | `qwen3-4b` | Q4_K_M | 6 | 156460 ms | 2671 ms | 16,8 tok/s | 387 | 110 | 9746 ms |
| transcripcion | `whisper-base` | Q8_0 | 1 | 2653 ms | — | — | — | — | 857 ms |
| transcripcion | `parakeet-tdt-0.6b-v3` | Q8_0 | 2 | 3689 ms | — | — | — | — | 3793 ms |
| placa | `visionpsy-nano-460m` | Q8_0 | 32 | 2085 ms | 1142 ms | 89,0 tok/s | 368 | 51 | 2244 ms |
| consulta | `qwen3-1.7b` | Q4 | 25 | 2863 ms | 137 ms | 62,6 tok/s | 82 | 19 | 542 ms |

La carga mínima es con el modelo ya descargado; la primera carga incluye la descarga desde el registro de QVAC. Los datos de los prompts son ficticios.

Para regenerar: `npm run perf:resumen -w @quorum/server`.
