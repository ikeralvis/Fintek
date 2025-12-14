# Configuración de Google OAuth para Supabase

Para habilitar el inicio de sesión con Google en tu aplicación, necesitas configurar un proyecto en Google Cloud y conectar las credenciales con Supabase.

## Paso 1: Configurar Google Cloud Platform (GCP)

1.  Ve a [Google Cloud Console](https://console.cloud.google.com/).
2.  Crea un **Nuevo Proyecto** (o selecciona uno existente). Llama al proyecto "Expense Tracker" (o similar).
3.  Busca y selecciona **"APIs & Services"** > **"OAuth consent screen"**.
    -   Selecciona **External**.
    -   Rellena los datos obligatorios.
    -   Guarda y continúa (no necesitas scopes especiales por ahora).
4.  Ve a **"Credentials"** > **"Create Credentials"** > **"OAuth client ID"**.
    -   **Application type**: Web application.
    -   **Authorized JavaScript origins**: `https://<tu-proyecto>.supabase.co`
    -   **Authorized redirect URIs**: `https://<tu-proyecto>.supabase.co/auth/v1/callback`
        > ⚠️ **IMPORTANTE**: En Google Cloud SOLO va la URL de callback de Supabase. **NO** pongas aquí localhost ni Vercel. Google habla con Supabase, y Supabase habla con tu app.
    -   Haz clic en **Create**.
5.  Copia el **Client ID** y el **Client Secret**.

## Paso 2: Configurar Supabase (Credenciales)

1.  Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard).
2.  **Authentication** > **Providers** > **Google**.
3.  Activa **Enable Google**.
4.  Pega el **Client ID** y **Client Secret**.
5.  Haz clic en **Save**.

## Paso 3: Configurar Redirecciones en Supabase (URL Configuration)

Aquí es donde defines a dónde vuelve el usuario después de que Google le da el "OK" a Supabase.

1.  Ve a **Authentication** > **URL Configuration**.
2.  **Site URL**: Pon tu URL de producción: `https://fintek-app.vercel.app`
3.  **Redirect URLs**: Añade manualmente todas las URLs donde tu app puede estar corriendo:
    -   `http://localhost:3000/**`
    -   `https://fintek-app.vercel.app/**`
    -   (Cualquier otra preview URL de Vercel si usas)
4.  Guarda los cambios.

## Paso 4: Código (Ya implementado)

El botón de inicio de sesión llamará a:
```typescript
supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
})
```
Esto asegura que si estás en `localhost`, vuelva a `localhost` (porque está en la lista permitida del Paso 3).
