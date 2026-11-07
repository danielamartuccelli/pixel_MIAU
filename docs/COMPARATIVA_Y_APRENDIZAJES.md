# Lima de a dos — Aprendizajes y trazabilidad (v1.1)

## 1. Modo de juego (v1.1)
**Solo online:** cada uno en su laptop (`index.html`), unidos con un código de amor de 5 letras. En la v1.1 se eliminó `local.html` (modo una laptop): la información oculta (cartas, pedidos) y el rendimiento funcionan mejor con una pantalla por persona.

## 2. Consideraciones para jugar
- Usar **Chrome o Edge** actualizados; cerrar pestañas pesadas y probar **pantalla completa**.
- Cada modo guarda sus datos en el `localStorage` de ese navegador; borrar datos del navegador borra récords (en online se recuperan del otro jugador).
- Los tiempos y balance de varios juegos (Cocina, Pollos, Saoco, Card-jitsu) están **sin playtest real**; ajustar en sus archivos `*_sim.js`.

## 3. Trazabilidad por versión
| Versión | Contenido |
|---|---|
| v0.2–0.3 | Base, historia del pingüino (con "Saltar ⏭"), igloo, clóset, mapa de Lima. |
| v0.4 | Lugares: igloo, casa de Sebas (Miraflores), cocina (Lince); mapa con scroll. |
| v0.5 | Kennedy (carrera de gatos). |
| v0.6 | PUCP (escondidas). |
| v0.7 | Cocina Los Ccellis (ramen cooperativo, premio Martuccini), Pollos (El Pollo Pier), Academia Saoco (salsa). |
| v0.8 | Cuatro en raya y Card-jitsu (con bufandas). |
| v0.9 | Pantalla final "Feliz 2 años y medio". |
| v1.0 | Cinturón → **bufanda**; final con ambos frente a frente dentro del corazón; **2 años y 6 meses** (antes salía mal); cocina con decoración morada; playas Callao y Los Yuyos; trajes de baño; álbum de fotos; **modo una laptop**. |

## 4. Aprendizajes de estos chats
1. **Revisar qué trae realmente el zip.** El de Daniela era v0.2 aunque el resumen decía v0.3; se perdió trabajo por asumir.
2. **El resumen de traspaso y las indicaciones son la memoria.** Mantener `CLAUDE.md`, `RESUMEN_TRASPASO.md` y `INDICACIONES_DANIELA.md` al día en cada etapa.
3. **Phaser y teclado:** `preventDefault` de flechas/espacio en `window` *después* de arrancar Phaser; no usar `Enter` como acción (abre el chat); teclas numéricas `keydown-ONE`.
4. **Un solo anfitrión decide:** el host controla el flujo y solo él suma soles y récords; así no se duplican.
5. **Misma semilla, cada cliente simula lo suyo:** menos tráfico y menos desincronización.
6. **El HUD DOM tapa el canvas:** revisar solapes con capturas; poner decoración y barras fuera de esas zonas.
7. **Mirar el sprite orientado:** `l0` sin flip mira a la izquierda; derecha = `flipX`. Esto causó el "de costado" en el cierre.
8. **Fechas:** redondear por meses (≥15 días suma un mes) para que el texto "2 años y medio" sea correcto.
10. **Probar con Playwright y modo solo** (`?solo=1&go=…`) antes de entregar; capturas por etapa.
11. **Pendientes de preguntar a Daniela:** nombre real del bar de pollos, qué quería en la casa de Sebas (frase cortada) y el documento original de diseño audiovisual de pollos (solo se tuvo el INDICACIONES).
