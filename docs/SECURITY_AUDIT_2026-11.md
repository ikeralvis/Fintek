# Auditoría de seguridad — Fintek (noviembre 2026)

**Commit revisado:** `afae2d6` (rama `master`, árbol limpio)
**Alcance:** revisión de código fuente (Next.js 16 + Supabase), SQL versionado en el repo, crons, server actions, componentes cliente con acceso directo a Supabase, cabeceras HTTP y dependencias (`npm audit --omit=dev`).
**Método:** análisis estático; no se ha ejecutado nada contra Supabase ni contra producción. Lo que depende de la configuración real de Supabase (políticas RLS que no están en el repo, cuerpo del trigger de saldo, ajustes de Auth) figura como **"Pendiente de verificar"** y no tiene severidad.

> Este informe sustituye a `docs/SECURITY_AUDIT.md` (2024), que está desactualizado: hoy RLS ya está definida para las tablas principales, pero no comprueba la propiedad de las claves foráneas, que es el problema central de este informe.

---

## Resumen

| ID | Hallazgo | Estado | Severidad |
|----|----------|--------|-----------|
| F-01 | Los crons con `service_role` mueven saldos de cuentas de **otros usuarios** (las FKs no se validan) | Confirmado en el código | **Alta** |
| F-02 | Dependencias con vulnerabilidades conocidas (Next.js con advisories críticos, zod, sharp, dompurify) | Confirmado (`npm audit`) | **Alta** |
| F-03 | Saldos actualizados con lectura‑modificación‑escritura no atómica (transferencias y crons) | Confirmado en el código | Media |
| F-04 | Redirección abierta en `/auth/callback` (`next` + `x-forwarded-host`) | Confirmado en el código; difícil de explotar | Baja |
| F-05 | CSP con `script-src 'unsafe-inline'` y `img-src https:` | Confirmado | Baja (refuerzo) |
| F-06 | Los apartados (`pocket_move`) se saltan el control de saldo si la cuenta no es tuya | Confirmado; solo afecta al propio usuario | Informativo |
| F-07 | El bloqueo con biometría es solo de interfaz (sin verificación en servidor) | Por diseño | Informativo |
| F-08 | Errores internos de la BD devueltos al cliente (`err.message`) | Confirmado | Baja |
| V-01 | RLS de `subscriptions`, `push_subscriptions`, `notification_settings`, `investment_snapshots` no está en el repo | Pendiente de verificar | — |
| V-02 | `update_account_balance()`: ¿`SECURITY DEFINER`? ¿comprueba la propiedad de la cuenta? | Pendiente de verificar | — |
| V-03 | Política de contraseñas de Supabase Auth (el cliente solo exige 6 caracteres) y Turnstile opcional | Pendiente de verificar | — |

**Lo que está bien:** RLS activada con `user_id = (select auth.uid())` en las tablas principales; los crons exigen `CRON_SECRET` con fallo cerrado si falta; la `service_role` solo se usa en servidor (`lib/supabase/admin.ts`); el middleware usa `getUser()` (valida el JWT) y no `getSession()`; validación con zod en transferencias, recurrentes y apartados; cabeceras de seguridad (HSTS con preload, `frame-ancestors 'none'`, `nosniff`, `object-src 'none'`, Permissions-Policy); no hay `dangerouslySetInnerHTML` con datos de usuario (el único es el JSON‑LD estático de la landing); logout por `POST`; `.env*` ignorado en git.

---

## F-01 — Los crons con `service_role` escriben en cuentas de otros usuarios (Alta)

**Frontera que se cruza:** usuario A (autenticado) → saldo de la cuenta del usuario B.

Las políticas RLS solo comprueban `user_id = auth.uid()` en la fila que se inserta. **No comprueban** que `account_id`, `to_account_id` o `related_account_id` pertenezcan a ese mismo usuario. Las claves foráneas solo exigen que la cuenta exista. Después, los crons procesan esas filas con el cliente admin, que se salta RLS:

- `app/api/cron/process-subscriptions/route.ts:85-112` — para `type = 'transfer'` lee `accounts` por `id IN (account_id, to_account_id)` y **actualiza `current_balance` de ambas sin filtrar por `user_id`**.
- `app/api/cron/route.ts:31-43` — inserta en `transactions` con `account_id = rt.account_id`; el trigger de saldo actualiza esa cuenta, y con `service_role` RLS no interviene.

**Cómo llega el atacante:**
1. `components/dashboard/SubscriptionsPage.tsx:142-163` inserta en `subscriptions` desde el navegador con `account_id`/`to_account_id` que controla el cliente. Cualquiera puede llamar a PostgREST con su JWT y la anon key, sin pasar por la UI.
2. `lib/actions/recurring.ts:85-101` (`createRecurringTransaction`) valida que `accountId` sea un UUID, pero no que la cuenta sea del usuario.

**Resultado:** si A conoce el UUID de una cuenta de B, puede crear una suscripción de tipo transferencia `account_id = cuenta de B → to_account_id = cuenta de A`. Cada noche el cron resta el importe del saldo de B y lo suma al de A. B no ve la transacción, porque es de `user_id = A`, pero su saldo cambia. Con recurrentes ocurre lo mismo sobre `transactions`.

**Precondición que limita el riesgo:** hace falta el UUID de la cuenta de la víctima. No se puede adivinar, pero aparece en las URLs (`/dashboard/cuentas/[id]`), en capturas, en logs, etc. No hay que fiarse de que un UUID sea secreto.

**Arreglo mínimo (hay que hacer las dos cosas):**
1. **En la base de datos**, en las políticas `INSERT`/`UPDATE` (`WITH CHECK`) de `transactions`, `subscriptions`, `recurring_transactions`, `account_pockets` y `budgets`/`investment_snapshots` si referencian cuentas o categorías:
   ```sql
   with check (
     user_id = (select auth.uid())
     and exists (select 1 from accounts a where a.id = account_id and a.user_id = (select auth.uid()))
     and (to_account_id is null or exists (select 1 from accounts a where a.id = to_account_id and a.user_id = (select auth.uid())))
   )
   ```
   Lo mismo para `related_account_id` y `category_id`. Añade también `WITH CHECK` a las políticas `UPDATE`, que ahora solo tienen `USING` y permiten cambiar `account_id` a uno ajeno al actualizar.
   Otra opción más robusta: FKs compuestas `(account_id, user_id) → accounts(id, user_id)` con un `UNIQUE (id, user_id)` en `accounts`.
2. **En los crons**, filtra siempre por el dueño: `.eq('user_id', sub.user_id)` en las lecturas y actualizaciones de `accounts`, y descarta la fila si alguna cuenta no pertenece a `sub.user_id`.

**Test de regresión:** con dos usuarios de prueba, A inserta una `subscription` con `account_id` de B. Debe fallar por RLS, y el cron no debe tocar cuentas cuyo `user_id ≠ sub.user_id`.

---

## F-02 — Dependencias vulnerables (Alta)

`npm audit --omit=dev`: **5 vulnerabilidades (1 crítica, 3 altas, 1 baja)**.

- `next@16.3.5` (rango afectado 16.0.0–16.4.4): varios advisories, entre ellos exposición de cookies HttpOnly en rutas Edge (GHSA-f3mh-rxg3-f5g2), fuga y envenenamiento de caché entre usuarios con `use cache` (GHSA-rhh4-g77r-r9qj, GHSA-vc7v-qv4w-wrv8) y bypass del rechazo de SVG en el optimizador de imágenes. En una app que maneja sesiones, la fuga de cookies es la más relevante.
- `zod@4.6.5` (< 4.6.6): agotamiento de memoria con colecciones grandes. Se usa en server actions, así que cualquiera puede alcanzarlo.
- `sharp`, `source-map-js`, `dompurify` (transitivas).

**Arreglo:** `npm audit fix` (o subir `next` a ≥ 16.4.5 y `zod` a ≥ 4.6.6), volver a pasar lint, typecheck y tests, y añadir `npm audit --omit=dev --audit-level=high` al CI (`.github/workflows/ci.yml`) para que falle con nuevos avisos. Activar Dependabot o Renovate.

---

## F-03 — Saldos no atómicos (Media, integridad)

`lib/actions/transfers.ts:47-112` (crear), `:190-232` (editar), `:280-303` (borrar) y el cron de transferencias leen `current_balance`, calculan en JS y escriben el valor absoluto en varias llamadas separadas:

- **Carreras:** dos operaciones simultáneas sobre la misma cuenta (dos pestañas, la app junto al cron) pierden una de las actualizaciones.
- **Fallo parcial:** si falla la segunda actualización, la transacción ya existe y solo se ha movido una de las cuentas. `deleteTransfer` además ignora los errores de las actualizaciones.
- La comprobación de "saldo insuficiente" se hace en el cliente de servidor y se puede saltar con una carrera.

**Arreglo:** mover crear, editar y borrar transferencias a una función SQL (`rpc`) `SECURITY INVOKER` que haga todo en una sola transacción: `SELECT … FOR UPDATE` de las dos cuentas (comprobando `user_id = auth.uid()`), `INSERT` de la transacción y `UPDATE … SET current_balance = current_balance ± amount`. Mejor aún, que el trigger de saldo también cubra `transfer`. `pocket_move` ya sigue este patrón.

---

## F-04 — Redirección abierta en `/auth/callback` (Baja)

`app/auth/callback/route.ts:7,18-20`: `next` se concatena sin validar: `` `https://${forwardedHost}${next}` ``. Con `next=@evil.com` el resultado es `https://fintek.app@evil.com`, y con `next=.evil.com` es `https://fintek.app.evil.com`. Solo se llega a la redirección si `exchangeCodeForSession` tiene éxito, lo que exige un código PKCE válido del navegador de la víctima. Por eso es difícil de explotar, pero es trivial de cerrar:

```ts
const raw = searchParams.get('next') ?? '/dashboard';
const next = raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/\\') ? raw : '/dashboard';
// y construir siempre con new URL(next, origin) en lugar de confiar en x-forwarded-host
```

---

## F-05 — CSP mejorable (Baja, defensa en profundidad)

`next.config.ts:9-22`. `script-src 'self' 'unsafe-inline'` anula la protección de la CSP frente a XSS, e `img-src https:` permite sacar datos a cualquier dominio mediante imágenes. Hoy no hay ningún XSS confirmado; esto es un refuerzo.

Según la guía *security* de Modern Web Guidance, la CSP recomendada es por nonce: *"script-src 'nonce-{RANDOM}' 'strict-dynamic' 'report-sample'"*. Next 16 lo admite generando el nonce en `proxy.ts` y pasándolo por cabecera; `next-themes` acepta la prop `nonce`. Pasos:
1. Desplegar primero como `Content-Security-Policy-Report-Only` con `report-to` y revisar los informes.
2. `script-src 'nonce-…' 'strict-dynamic'`, `base-uri 'none'`, y reducir `img-src` a `'self' data: blob:` más los dominios concretos (wikimedia para los logos y el de Supabase Storage si se usa).
3. `style-src 'unsafe-inline'` puede quedarse (lo necesitan los `style={{…}}`), con riesgo bajo.
4. Añadir `Cross-Origin-Opener-Policy: same-origin-allow-popups` (es compatible con OAuth de Google).
5. En `/api/auth/signout`, enviar `Clear-Site-Data: "cache", "storage"` para que al cerrar sesión no queden datos financieros en la caché ni en el almacenamiento de un dispositivo compartido. Ojo: `"cookies"` también borraría `fintek_lock`.
6. Revisar `public/sw.js`: no debe cachear respuestas de `/dashboard` ni de server actions.

---

## F-06 — `pocket_move` sin control de saldo si la cuenta no es tuya (Informativo)

`createPocket` (`lib/actions/pockets.ts:33`) no comprueba que `accountId` sea tuyo. En `pocket_move`, la `SELECT current_balance` sobre una cuenta ajena devuelve `NULL` por RLS, y `p_amount > NULL - x` se evalúa como `NULL`, así que **no salta la excepción** y el apartado acepta cualquier importe. Solo afecta a los datos del propio atacante, pero muestra el mismo patrón que F-01. Con la política de F-01 queda cerrado. Además, en la función conviene añadir `if v_account_balance is null then raise exception …`.

## F-07 — Bloqueo biométrico solo de interfaz (Informativo)

`lib/appLock.ts`: el reto WebAuthn se genera y se "verifica" en el cliente (`return !!assertion`), y el estado vive en `localStorage` y `sessionStorage`. Cualquiera con acceso al dispositivo puede saltárselo desde DevTools. El propio código lo documenta como bloqueo local, así que es aceptable si se comunica así en la UI. Si se quisiera que el bloqueo protegiera de verdad, el reto tendría que firmarse y verificarse en el servidor (guía *passkey-reauthentication*).

## F-08 — Errores de la BD expuestos al cliente (Baja)

Muchas server actions devuelven `err.message` tal cual (por ejemplo `transfers.ts:120`, `recurring.ts:105`, `pockets.ts:41`). Eso revela nombres de tablas, constraints y políticas. Mejor registrar el error en el servidor y devolver un mensaje genérico.

---

## Pendiente de verificar en Supabase (sin severidad)

- **V-01.** `secure_tables.sql` no activa RLS en `subscriptions`, `push_subscriptions`, `notification_settings`, `investment_snapshots` ni `budget_rollover_actions`/`account_pockets` (estas dos últimas sí, en `sql/`). Si alguna de las primeras no tiene RLS, **cualquiera con la anon key (que es pública) puede leer o modificar los datos de todos los usuarios**. Para comprobarlo, en el SQL Editor:
  ```sql
  select relname, relrowsecurity from pg_class
  where relnamespace = 'public'::regnamespace and relkind = 'r';
  select * from pg_policies where schemaname = 'public';
  ```
  Si aparece alguna tabla con `relrowsecurity = false`, eso es **Crítico** y hay que corregirlo de inmediato.
- **V-02.** El cuerpo de `update_account_balance()` no está en el repo. Si es `SECURITY DEFINER` y no comprueba el dueño, un usuario podría alterar saldos ajenos **directamente** (sin esperar al cron) insertando una transacción con `account_id` ajeno. Para comprobarlo: `select prosecdef, prosrc from pg_proc where proname = 'update_account_balance';`. La política de F-01 lo cierra en cualquier caso.
- **V-03.** En Supabase Auth: longitud mínima de contraseña (recomendado ≥ 10 y comprobación de contraseñas filtradas, que Supabase incluye), confirmación de email obligatoria, CAPTCHA activado en el servidor (hoy `TurnstileWidget` solo funciona si existe la site key; si no se configura, no hay CAPTCHA), límites de peticiones y lista de URLs de redirección sin comodines amplios. Para una app financiera, valorar MFA (TOTP de Supabase).

## Otras recomendaciones de proceso

- Versionar **todo** el esquema real (`supabase db dump --schema public` o migraciones de Supabase CLI): funciones, triggers, todas las políticas. Hoy el repo no refleja la base de datos, y eso impide auditarla. Nota: `.gitignore` ignora `.sql` y `/migrations`.
- Añadir tests de RLS con dos usuarios (pgTAP o integración con dos JWT) que comprueben que A no puede leer ni referenciar recursos de B.
- `CRON_SECRET`: usar una comparación en tiempo constante (`crypto.timingSafeEqual`). Es una mejora menor.

## Prioridad de remediación

1. **Hoy:** comprobar V-01 y V-02 en Supabase; `npm audit fix` (F-02).
2. **Esta semana:** políticas RLS con comprobación de propiedad de las FKs y filtros por `user_id` en los crons (F-01); validar `next` (F-04).
3. **Después:** transferencias atómicas por RPC (F-03), CSP por nonce y `Clear-Site-Data` (F-05), mensajes de error genéricos (F-08), versionar el esquema y tests de RLS.

---

## Estado de la remediación (25/11/2026)

| ID | Estado | Dónde |
|----|--------|-------|
| F-01 | Corregido en el código y en el SQL (**hay que ejecutar el SQL**) | `sql/2026-11_security_hardening.sql` (políticas `own_*` con `owns_account`/`owns_category`/…), `app/api/cron/*` (comprobación de propiedad) |
| F-02 | Corregido | `next` 16.4.6, `zod` 4.6.7, `vitest` 5; `npm audit` → 0 vulnerabilidades |
| F-03 | Corregido (**necesita el SQL**) | RPC `create_transfer` / `update_transfer` / `delete_transfer`; `lib/actions/transfers.ts` y el cron las usan |
| F-05 | Corregido | CSP con nonce y `'strict-dynamic'` en `proxy.ts`, `COOP` en `next.config.ts`, `Clear-Site-Data: "cache"` en el logout. `CSP_REPORT_ONLY=1` la pasa a Report-Only como vía de escape |
| F-06 | Corregido (**necesita el SQL**) | `pocket_move` falla si la cuenta no es visible |
| F-08 | Corregido | `lib/actionError.ts`: el error real se registra en el servidor; al cliente solo llegan mensajes propios (`P0001`) o genéricos |
| F-04, F-07 | Pendientes | — |
| V-01 | Verificado (25/11): todas las tablas tienen RLS. Las políticas estaban duplicadas, no comprobaban la propiedad de las FKs y los UPDATE no tenían WITH CHECK; la migración las sustituye | `sql/security_checks.sql` |
| V-02 | Verificado: `update_account_balance` es SECURITY INVOKER y no comprueba dueño. Desde la app, RLS de `accounts` lo contiene; desde los crons (service_role) no, lo que confirma F-01. Ignora `transfer`, en línea con las nuevas RPC | — |
| V-03 | Pendiente (ajustes de Auth en el panel de Supabase) | — |

**Orden de despliegue:** 1) ejecutar `sql/2026-11_security_hardening.sql` en Supabase; 2) desplegar el código. Con el orden al revés, las transferencias fallan hasta que existan las funciones SQL.
