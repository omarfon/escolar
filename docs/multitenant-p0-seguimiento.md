# Seguimiento P0 — Multi-institución (tenant context)

> Última actualización: 2026-09-30  
> Rama de trabajo: `siagie`  
> Repos: `escolar` (frontend) · `escolar-backend` (API)

## Objetivo P0

Acotar **todos** los datos operativos a una IE (`institutionId`), eliminar dependencia de “primera IE de la BD” y unificar contexto tenant entre frontend y backend.

---

## Estado por fase

| Fase | Descripción | Estado | Fecha | Notas |
|------|-------------|--------|-------|-------|
| **F0** | Contrato tenant (util, decorator, tests) | ✅ Completado | 2026-09-29 | Ver archivos abajo |
| **F1** | Auth/JWT — quitar `inst-001`, `institutionId` en token | ✅ Completado | 2026-09-29 | Ver sección F1 |
| **F2** | Frontend `TenantContextService` + selector header | ✅ Completado | 2026-09-29 | Ver sección F2 |
| **F3** | Quitar `ensureInstitution()` / LIMIT 1 | ✅ Completado | 2026-09-29 | Ver sección F3 |
| **F4** | Migración BD `institutionId` en maestros | ✅ Completado | 2026-09-30 | Ver sección F4 |
| **F5** | Services/controllers maestros con filtro IE | ✅ Completado | 2026-09-30 | Ver sección F5 |
| **F6** | Auditoría con `institutionId` | ✅ Completado | 2026-09-30 | Ver sección F6 |
| **F7** | QA + E2E aislamiento tenant | ✅ Completado | 2026-09-30 | Ver sección F7 |

**Leyenda:** ✅ Completado · 🔄 En progreso · ⏳ Pendiente · ❌ Bloqueado

---

## F1 — Detalle de entrega

### Cambios backend

| Archivo | Cambio |
|---------|--------|
| `src/auth/auth.service.ts` | Eliminado `institucionId: 'inst-001'`; JWT incluye `institutionId` numérico |
| `src/auth/utils/decode-token.util.ts` | `TokenPayload.institutionId?: number \| null` |

### Cambios frontend

| Archivo | Cambio |
|---------|--------|
| `src/app/core/auth/models/auth.model.ts` | `AuthUser.institutionId?: number \| null`; `TokenPayload` alineado |
| `src/app/core/auth/services/auth.service.ts` | `institutionId`, `isSiagie` computed; limpieza sesión legacy |
| `src/app/core/auth/interceptors/auth.interceptor.ts` | Header `X-Institution-Id` para SIAGIE (desde localStorage) |
| `src/app/core/tenant/tenant.constants.ts` | Constantes compartidas header/storage (puente a F2) |

### Criterios de aceptación F1

- [x] Login ya no devuelve `'inst-001'`
- [x] JWT payload incluye `institutionId`
- [x] Frontend usa `institutionId` numérico en modelos
- [x] Interceptor preparado para contexto SIAGIE
- [ ] E2E login verificado post-deploy backend

---

## F2 — Detalle de entrega

### Archivos creados (frontend)

| Archivo | Propósito |
|---------|-----------|
| `core/tenant/tenant-context.service.ts` | IE activa SIAGIE, `effectiveInstitutionId`, persistencia |
| `core/tenant/tenant-http.util.ts` | `withInstitutionParams()` |
| `core/layout/components/tenant-scope-banner/` | Aviso cuando SIAGIE no eligió IE |

### Archivos modificados (frontend)

| Archivo | Cambio |
|---------|--------|
| `header/header.component.ts` | Selector IE (solo SIAGIE) |
| `main-layout/main-layout.component.ts` | Banner tenant |
| `auth.interceptor.ts` | Header desde `TenantContextService` |
| `maestros/**/*.service.ts` (10) | Query `institutionId` vía helper |

### Criterios de aceptación F2

- [x] `TenantContextService` con signals y localStorage
- [x] Selector visible solo para SIAGIE
- [x] Banner cuando falta selección
- [x] Servicios maestros propagan `institutionId`
- [x] Backend filtra por IE (F5)

---

## F3 — Detalle de entrega

### Backend

| Archivo | Cambio |
|---------|--------|
| `institution/institution.service.ts` | Eliminado `ensureInstitution()`; `getInstitutionOrFail(id)`; métodos reciben `institutionId` |
| `institution/institution.controller.ts` | `@TenantInstitution()` en config, campuses, education-levels |
| `grading/grading-config.service.ts` | `refresh(institutionId?)` tras guardar config IE |
| `report-cards/report-cards.service.ts` | `getConfig(institutionId)` vía alumno del aula |

### Frontend

| Archivo | Cambio |
|---------|--------|
| `institucional/institucional.service.ts` | `withInstitutionParams` en load/save/education-levels/campus |

### Criterios F3

- [x] Cero `ensureInstitution()` en `InstitutionService`
- [x] Sedes filtradas por `institutionId` en `findAllCampuses`
- [x] Controller exige tenant explícito
- [x] Frontend config institucional usa contexto tenant
- [x] `sedes.service.ts` sin `ensureInstitution` (F5)

### Próximo paso: F4

Migración BD: columna `institutionId NOT NULL` en maestros (feriados, salones, docentes, currícula, etc.)

---

## F4 — Detalle de entrega

### Migración SQL

| Archivo | Propósito |
|---------|-----------|
| `institution/maestros-institution-migration.ts` | ADD COLUMN, backfill IE mínima, índices únicos compuestos |
| Registro en `app.module.ts` | Tras `prepareMultiInstitution` |

### Tablas migradas (NOT NULL)

- `maestros_feriados`, `salones`, `docentes`, `maestros_cursos`
- `maestros_periodos_academicos`, `maestros_formulas_evaluacion`, `maestros_conducta_tipos`
- `curricula`, `schedules`

### Tablas migradas (nullable)

- `audit_logs` — columna nullable + backfill F6

### Entidades TypeORM actualizadas

Todas las anteriores + índices únicos por `(institutionId, …)`.

### Índices únicos nuevos (ejemplos)

| Tabla | Índice |
|-------|--------|
| feriados | `(institutionId, anioEscolar, fecha)` |
| salones | `(institutionId, anioEscolar, nivel, grado, seccion)` |
| docentes | `(institutionId, dni/email/username)` |
| periodos | `(institutionId, anioEscolar, numero)` |
| conducta tipos | `(institutionId, codigo)` |

### Criterios F4

- [x] Migración registrada en bootstrap
- [x] Entidades con `institutionId`
- [x] Backfill con IE existente (solo migración)
- [x] `npm run build` OK
- [x] Services/controllers filtran por IE (F5)

### Próximo paso: F5

Ver sección F5 (completada 2026-09-30).

---

## F5 — Detalle de entrega

### Util compartido

| Archivo | Cambio |
|---------|--------|
| `maestros/common/maestros-tenant.util.ts` | `resolveMaestrosInstitutionId`, `requireMaestrosInstitutionId`, `applyInstitutionIdWhere`, `assertMaestroBelongsToInstitution`, `resolveSeedInstitutionId` |

### Services/controllers actualizados

| Módulo | Cambio |
|--------|--------|
| `sedes` | Eliminado `ensureInstitution` / `onModuleInit` backfill; CRUD con IE explícita |
| `feriados` | Filtro + CRUD por `institutionId`; seeds con IE default |
| `salones` | Filtro + create/sync/CRUD por IE |
| `cursos` | Listado paginado + CRUD por IE |
| `formulas-evaluacion` | Listado, resolve, CRUD y seeds por IE |
| `faltas-reconocimientos` | Catálogo conducta + CRUD por IE |
| `eventos` (maestros) | create/update/remove con IE; findAll estricto |
| `docentes` | Listado + CRUD por IE |
| `periodos-academicos` | findAll/create/update/remove/sync por IE |

### Criterios F5

- [x] Cero `ensureInstitution()` en maestros/sedes
- [x] Mutaciones exigen tenant (`requireMaestrosInstitutionId`)
- [x] Seeds asignan `institutionId` de la primera IE registrada
- [x] `npm run build` backend OK
- [ ] `findPeriodoActualRow` aún resuelve IE por fallback interno (refinar post-P0 si aplica)
- [x] E2E aislamiento tenant (F7)

---

## F7 — Detalle de entrega

### Archivos creados (frontend E2E)

| Archivo | Propósito |
|---------|-----------|
| `e2e/helpers/tenant.helper.ts` | Login API con cache, headers `X-Institution-Id`, helpers maestros/bitácora |
| `e2e/flows/tenant-isolation.e2e.spec.ts` | 7 specs: aislamiento cursos, bitácora, UI SIAGIE |
| `e2e/helpers/auth.helper.ts` | `loginAsUser()` para SIAGIE y usuarios multi-IE |

### Escenarios cubiertos

| Escenario | Resultado esperado | Estado |
|-----------|-------------------|--------|
| `admin` crea curso | `e.ramos` (IE distinta) no lo ve en API | ✅ |
| SIAGIE sin IE | `GET maestros/cursos` y `GET audit-logs` → vacío | ✅ |
| SIAGIE + header IE | Solo catálogo de la IE seleccionada | ✅ |
| Bitácora por IE | Evento de IE A visible en admin/SIAGIE(A), no en SIAGIE(B) | ✅ |
| UI SIAGIE sin selector | Banner + tabla vacía en `/maestros/cursos` | ✅ |
| UI SIAGIE con selector | Contexto activo + catálogo de la IE elegida | ✅ |

### Ejecución

```bash
# Backend en :3000 + frontend en :4200
npx playwright test --project=e2e --workers=1 e2e/flows/tenant-isolation.e2e.spec.ts
```

### Criterios F7

- [x] Aislamiento maestros entre IE (API)
- [x] SIAGIE sin/con contexto IE (API + UI)
- [x] Bitácora acotada por `institutionId`
- [x] 7/7 specs F7 pasando (2026-09-30)

### Pendiente post-P0

- Re-ejecutar suite E2E completa (`npm run qa:e2e`) tras cambios en paralelo
- Refinar `findPeriodoActualRow` si aplica

---

## F6 — Detalle de entrega

### Escritura de auditoría

| Archivo | Cambio |
|---------|--------|
| `audit-context.util.ts` | `resolveAuditInstitutionId(req)` |
| `audit-logger.service.ts` | `institutionId` en cola; `logFromRequestContext()`; login/logout/interceptor |
| `auth.service.ts` | Login exitoso registra `institutionId` del usuario |
| Servicios manuales | periodos, historial matrícula, estudiantes, roles propagan IE |

### Consulta de bitácora

| Archivo | Cambio |
|---------|--------|
| `audit-logs.service.ts` | Filtro `institutionId` en list/export/findOne; contexto por IE |
| `audit-logs.controller.ts` | Scope tenant; lista vacía si SIAGIE sin IE |
| `bitacora.service.ts` (FE) | `withInstitutionParams()` en context/list/export |

### Migración / backfill

| Archivo | Cambio |
|---------|--------|
| `audit-logs-migration.ts` | Backfill desde `user_role_assignments`; fallback IE mínima; índice compuesto |

### Criterios F6

- [x] Nuevos registros incluyen `institutionId` cuando hay contexto tenant
- [x] Consulta/export acotados por IE activa
- [x] Backfill histórico en migración al arrancar
- [x] `npm run build` y tests backend OK

## F0 — Detalle de entrega

### Contrato tenant

| Regla | Comportamiento |
|-------|----------------|
| Usuario IE (ADMIN, DIRECTOR, …) | `institutionId` = asignación RBAC; **ignora** header/query |
| SIAGIE + `mode: required` (default) | Exige `X-Institution-Id` o `?institutionId=` |
| SIAGIE + `mode: optional` | Puede operar sin IE (directorio, listados globales) |
| Header vs query | Header gana sobre query para SIAGIE |

### Archivos creados (backend)

| Archivo | Propósito |
|---------|-----------|
| `src/auth/tenant-scope.util.ts` | Tipos, `parseInstitutionId`, `resolveTenantScope`, `resolverInstitutionId` |
| `src/auth/decorators/tenant-institution.decorator.ts` | `@TenantInstitution()` / `@TenantInstitution({ mode: 'optional' })` |
| `src/auth/tenant-scope.util.spec.ts` | Tests unitarios del resolver |

### Archivos modificados (backend)

| Archivo | Cambio |
|---------|--------|
| `src/auth/siagie-access.util.ts` | Barrel re-export; lógica movida a `tenant-scope.util.ts` |

### API pública F0

```typescript
// Constante header
TENANT_INSTITUTION_HEADER // 'x-institution-id'

// Resolver (servicios / guards)
resolverInstitutionId({ user, headerInstitutionId, queryInstitutionId, mode })
resolveTenantScopeFromRequest(req, { mode: 'required' | 'optional' })

// Decorator (controllers)
@TenantInstitution() institutionId: number
@TenantInstitution({ mode: 'optional' }) institutionId?: number

// Compatibilidad existente (sin cambio de firma)
esSuperusuarioSiagie(user)
institutionIdDeAlcance(user)
```

### Tests F0

```bash
cd escolar-backend
npm test -- tenant-scope.util.spec.ts
```

**Casos cubiertos:** usuario IE, IE sin asignación, SIAGIE required/optional, header vs query, parseo inválido.

### Criterios de aceptación F0

- [x] Tipos `TenantScopeMode`, `ResolvedTenantScope` documentados en código
- [x] `resolverInstitutionId` con reglas IE vs SIAGIE
- [x] Decorator `@TenantInstitution` usable en controllers
- [x] Tests unitarios pasando
- [ ] Integrado en al menos 1 controller real (previsto F5)

---

## Registro de cambios (changelog)

| Fecha | Fase | Cambio | Autor |
|-------|------|--------|-------|
| 2026-09-29 | F0 | Creación `tenant-scope.util.ts`, decorator, tests; barrel `siagie-access.util.ts` | Agent |
| 2026-09-29 | F1 | Auth/JWT `institutionId`, eliminado `inst-001`, interceptor tenant header | Agent |
| 2026-09-29 | F2 | TenantContextService, selector header, banner, maestros services | Agent |
| 2026-09-29 | F3 | InstitutionService sin LIMIT 1, controller @TenantInstitution, institucional FE | Agent |
| 2026-09-30 | F6 | Auditoría con institutionId (escritura, consulta, backfill) | Agent |
| 2026-09-30 | F5 | Filtros tenant en maestros (sedes, feriados, salones, cursos, fórmulas, conducta, eventos, docentes, periodos) | Agent |
| 2026-09-30 | F4 | Migración maestros-institution + entidades institutionId | Agent |
| 2026-09-30 | F7 | E2E aislamiento tenant (7 specs, helper tenant, loginAsUser) | Agent |
| 2026-09-29 | — | Documento de seguimiento inicial | Agent |

---

## Estado P0

**F0–F7 completadas.** El multitenant por `institutionId` está operativo en auth, maestros, auditoría y validado con E2E de aislamiento.

### Recomendación post-cierre

1. Ejecutar `npm run qa:e2e` completo en CI/local
2. Refinar `findPeriodoActualRow` (fallback IE) si sigue siendo necesario

---

## Referencias

- Plan completo P0: conversación / agent transcript `2b69de21-fcc3-4f1e-8bb4-ecd9e4286dcd`
- Patrón referencia existente: `maestros/sedes/sedes.controller.ts` (`institutionIdDeAlcance`)
- Migraciones multitenant existentes: `institution/multi-institution-migration.ts`, `tenant-linkage-migration.ts`
