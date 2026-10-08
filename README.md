# 📋 Productividad — Tareas, Hábitos y Notas

Aplicación de productividad personal construida con **Next.js 16 (App Router)**,
**Supabase** (auth + base de datos con Row Level Security), pagos recurrentes con
**Mercado Pago**, emails transaccionales con **Resend**, y pensada para desplegarse
en **Vercel**. Control de versiones con **GitHub**.

## ✨ Funcionalidades

- **Tareas**: crear, priorizar, poner fecha límite y completar.
- **Hábitos**: seguimiento diario con vista de los últimos 7 días.
- **Notas**: notas rápidas, se pueden fijar.
- **Cuentas**: registro/login con email y contraseña (Supabase Auth), email de bienvenida.
- **Plan Gratis vs Premium**: el plan gratis tiene límites (10 tareas activas, 3 hábitos,
  15 notas); el plan Premium (suscripción mensual vía Mercado Pago) no tiene límites.

## 🧱 Stack

| Capa | Servicio |
|---|---|
| Frontend + Backend | Next.js 16 (App Router, Server Actions) |
| Base de datos + Auth | Supabase (Postgres + RLS) |
| Pagos | Mercado Pago (Checkout Pro / Suscripciones - `preapproval`) |
| Emails | Resend |
| Hosting | Vercel |
| Repositorio | GitHub |

## 🚀 Puesta en marcha local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear el proyecto en Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. Ir a **SQL Editor** y ejecutar el contenido de
   [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql).
   Esto crea las tablas `profiles`, `tasks`, `habits`, `habit_logs`, `notes`,
   sus políticas de RLS y un trigger que crea el `profile` automáticamente
   cuando alguien se registra.
3. En **Authentication → URL Configuration**, agregar como *Redirect URL*:
   `http://localhost:3000/auth/callback` (y la URL de producción cuando despliegues).
4. Copiar `Project URL`, `anon public key` y `service_role key` desde
   **Settings → API**.

### 3. Crear la app en Mercado Pago

1. Crear una app en el [Panel de Desarrolladores de Mercado Pago](https://www.mercadopago.com.ar/developers/panel/app).
2. Copiar el **Access Token** (de prueba o de producción).
3. Configurar un webhook apuntando a `https://tu-dominio.com/api/mercadopago/webhook`
   suscripto al evento **Suscripciones (preapproval)**, y copiar la **firma secreta**.
4. Este proyecto usa el producto de **Suscripciones** (`PreApproval`) para cobrar el
   plan Premium mensual.

### 4. Crear la cuenta en Resend

1. Crear cuenta en [resend.com](https://resend.com).
2. Verificar un dominio (o usar el dominio de pruebas `onboarding@resend.dev` mientras
   desarrollás).
3. Copiar la API Key.

### 5. Variables de entorno

```bash
cp .env.example .env.local
```

Completá `.env.local` con las claves de Supabase, Mercado Pago y Resend
(ver comentarios dentro del archivo).

### 6. Correr en desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## ☁️ Despliegue en Vercel

1. Subí el repo a GitHub (ya está listo si estás leyendo esto desde el repo).
2. En [vercel.com](https://vercel.com), importá el repositorio. Vercel detecta
   Next.js automáticamente, no hace falta ningún archivo de configuración extra.
3. Cargá las mismas variables de entorno del `.env.example` en
   **Project Settings → Environment Variables**.
4. Definí `NEXT_PUBLIC_APP_URL` con la URL final de producción (ej.
   `https://tu-app.vercel.app`).
5. Actualizá el *Redirect URL* en Supabase Auth y el webhook de Mercado Pago para
   que apunten a la URL de producción.

## 🗂️ Estructura del proyecto

```
src/
  app/
    page.tsx                  # Landing pública
    (auth)/login, (auth)/signup   # Autenticación
    auth/callback              # Callback de confirmación de email
    (dashboard)/               # Rutas protegidas (requieren sesión)
      dashboard/                # Resumen general
      tasks/                    # Módulo de tareas
      habits/                   # Módulo de hábitos
      notes/                    # Módulo de notas
      billing/                  # Suscripción Premium
    api/mercadopago/webhook/   # Webhook de Mercado Pago
  lib/
    supabase/                  # Clientes de Supabase (browser/server/middleware)
    mercadopago.ts             # Helpers de Mercado Pago (crear/cancelar suscripción)
    resend.ts                  # Emails transaccionales
    plan-limits.ts             # Límites del plan gratis
supabase/migrations/           # SQL para crear el esquema en Supabase
```

## 🔒 Seguridad

- Todas las tablas tienen **Row Level Security**: cada usuario solo puede leer/escribir
  sus propios datos.
- La `service_role key` de Supabase solo se usa en el webhook de Mercado Pago
  (server-side), nunca se expone al cliente.
- El webhook valida la firma HMAC (`x-signature`) enviada por Mercado Pago antes de
  actualizar el plan de un usuario.
