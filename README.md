# Mono Cromat · Sistema de preapertura (PWA)

1. **Supabase**: crea un proyecto. En *SQL Editor* ejecuta `supabase/schema.sql` y luego `supabase/seed.sql`.
2. *Authentication → Users → Add user*: crea tu usuario (correo + contraseña).
3. *Authentication → Sign In / Providers*: **desactiva "Allow new users to sign up"** (si no, cualquiera con la URL podría registrarse y ver los datos).
4. *Project Settings → API*: copia la URL y la `anon` key.
5. Sube esta carpeta a un repo **privado** de GitHub.
6. En Vercel: Add New → Project → importa el repo. En *Environment Variables* agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Deploy.
7. Abre la URL en el celular y "Agregar a pantalla de inicio".

Local: copia `.env.example` a `.env`, `npm install`, `npm run dev`.
