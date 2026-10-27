# Urgencia App

**Pizarra digital en tiempo real para coordinar pacientes y equipo en las salas de una urgencia pediátrica.**

> Prototipo funcional. Ver [Limitaciones conocidas](#limitaciones-conocidas) antes de usarlo con datos reales.

---

## El problema

En una urgencia, saber **quién está en qué cama, qué tratamiento recibe y qué le falta** depende de una pizarra física o de la memoria del equipo. Eso genera:

- Información desactualizada apenas un paciente cambia de sala.
- Camas asignadas dos veces por error.
- Pendientes que se pierden en el cambio de turno.
- Dependencia total del sistema: si se cae, el equipo queda sin registro.

## La solución

Una aplicación web que sincroniza en tiempo real a todo el equipo:

- **Cinco salas**: Observación 1, Observación 2, Observación 3-4, Tratamiento y Reanimador, cada una con su contador de pacientes.
- **Ficha ágil**: paciente, cama, tratamiento, pendientes y marca de *requiere hospitalización*.
- **Validación de camas**: impide asignar una cama ya ocupada, tanto al ingresar como al trasladar.
- **Traslados entre salas** con confirmación de la nueva cama.
- **Equipo por sala**: enfermero/a, TENS y turno (día o noche).
- **Formato manual de respaldo**: descarga e imprime una planilla en papel de cualquier sala, para operar si falla la conexión.

## El impacto

- **Todos ven lo mismo, al mismo tiempo**, sin acercarse a una pizarra.
- **Cero camas duplicadas** gracias a la validación.
- **Pendientes visibles** para quien recibe el turno.
- **Continuidad operativa**: el respaldo en papel evita quedar sin registro.

## Stack

| Capa | Tecnología |
|---|---|
| Interfaz | React 19 (JavaScript), Lucide |
| Build | Vite 7 |
| Datos en tiempo real | Firebase / Cloud Firestore (`onSnapshot`) |
| Calidad | ESLint 9 |

## Inicio rápido

**Requisitos:** Node.js 20+ y un proyecto de Firebase con Firestore.

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar Firebase en src/firebase.js
#    (ver "Configuración de Firebase")

# 3. Levantar en desarrollo
npm run dev
```

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm run preview` | Vista previa de la compilación |
| `npm run lint` | Análisis con ESLint |

### Configuración de Firebase

Crear un proyecto en Firebase, habilitar Firestore y completar la configuración web en `src/firebase.js`. La aplicación usa dos colecciones:

| Colección | Contenido |
|---|---|
| `patients` | Paciente, cama, tratamiento, pendientes, sala, marca de hospitalización |
| `staff` | Equipo por sala: enfermero/a, TENS y turno |

## Estructura

```
src/
├── App.jsx        # Interfaz y lógica de la pizarra
├── firebase.js    # Conexión a Firestore
├── main.jsx
└── assets/
```

## Limitaciones conocidas

- **Sin autenticación**: cualquiera con acceso a la aplicación puede leer, editar o dar de alta pacientes.
- **Dar de alta elimina el registro** de la base de datos; no queda historial.
- **No usar datos reales de pacientes** hasta contar con autenticación y reglas de Firestore restrictivas.

## Licencia

Pendiente de definir.
