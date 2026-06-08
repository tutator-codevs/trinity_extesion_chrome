# 01 · Autenticación

**Estado: ✅ Hecho**

## Objetivo

Permitir iniciar sesión, mantenerla ~4h y cerrarla. Si el token caduca, volver al
login sin fricción.

## Contrato

```
POST /user/login   { username, password }   (sin auth)
→ { token, user: { id, username, firstName, lastName, email, roles[], ... } }
```

- `userId` = `user.id` (p.ej. `U-0000-2026-09`).
- El token dura ~4h. Si el backend no informa expiración, se asume `now + 4h`.

## UI / UX

- `src/components/Login.tsx`: marca Trinity, usuario + contraseña (con mostrar/ocultar),
  estados de carga y error en español, nota "tu sesión dura unas 4 horas".
- Logout: botón en la cabecera del Dashboard → limpia sesión → vuelve al login.

## Lógica

- `trinity.login()` mapea el `user` crudo a `User` (deriva `userId` de `id`),
  guarda token con expiración y usuario.
- `storage.isSessionValid()` valida token + expiración al abrir el popup.
- `storage.getUser()` sanea sesiones antiguas (rellena `userId` desde `id`).
- `api.ts`: ante **401** lanza `AuthError`, limpia la sesión; la UI vuelve al login.

## Pendientes

- (Opcional) Avisar antes de expirar y refrescar token si el backend lo soporta.
- Quitar `console.log` de debug de `trinity.login`.
