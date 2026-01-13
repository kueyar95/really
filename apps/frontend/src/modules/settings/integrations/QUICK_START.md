# 🚀 Inicio Rápido - UI de Medilink

## 🎯 En 5 Pasos

### 1️⃣ Ir a Configuración
```
Sidebar → ⚙️ Configuración → Integraciones
```

### 2️⃣ Click en Card de Medilink
```
Sección "Salud" → Card "Medilink" (con ícono de pacientes)
```

### 3️⃣ Pegar Token
```
En el modal:
├─ Tab "Conexión"
├─ Campo "Token de Acceso" → Pegar token de Medilink
├─ "URL Base" → Seleccionar versión (v1 o v2)
└─ "Conectar Medilink"
```

### 4️⃣ Probar Conexión
```
├─ Click en "Probar Conexión"
└─ Debe mostrar: ✅ "Conexión válida con Medilink"
```

### 5️⃣ Explorar Catálogos
```
Tab "Catálogos":
├─ Ver sucursales
├─ Click en sucursal → Ver profesionales
└─ Confirmar que todo se ve correcto
```

## 🎨 Vista Previa de la UI

```
┌─────────────────────────────────────────────────┐
│  Medilink                    [✅ Conectado]     │
│  ┌───┐                                          │
│  │🏥│  Integración con Medilink para           │
│  └───┘  agendamiento de citas médicas          │
└─────────────────────────────────────────────────┘
          ↓ (Click para abrir)
          
┌──────────────────────────────────────────────────────┐
│  🏥 Medilink                       [✅]               │
│  Gestiona la integración con Medilink                │
│                                                       │
│  [Conexión] [Estado] [Catálogos]                    │
│  ───────────────────────────────────────────────     │
│                                                       │
│  Token de Acceso *                                   │
│  ┌─────────────────────────────────────────┐        │
│  │ •••••••••••••••••••••••••••••••         │        │
│  └─────────────────────────────────────────┘        │
│  ℹ️ Genera el token en Medilink: Admin → API        │
│                                                       │
│  URL Base de la API                                  │
│  ┌─────────────────────────────────────────┐        │
│  │ Medilink v1 (api.medilink...)      ▼   │        │
│  └─────────────────────────────────────────┘        │
│                                                       │
│  Límite de Requests/Minuto                           │
│  ┌─────────────────────────────────────────┐        │
│  │ 20                                       │        │
│  └─────────────────────────────────────────┘        │
│                                                       │
│  [Conectar Medilink]  [Probar Conexión]            │
│                                                       │
│  Ayuda:                                              │
│  • El token se almacena cifrado                      │
│  • Solo usuarios admin pueden conectar               │
│  • Documentación: api.medilink.healthatom.com →     │
└──────────────────────────────────────────────────────┘
```

## 📊 Estados de la Card

### 🟢 Conectado
```
┌────────────────────────────┐
│ Medilink  [✅ Conectado]  │
└────────────────────────────┘
```

### 🔴 Token Inválido
```
┌────────────────────────────────┐
│ Medilink  [⚠️ Token Inválido] │
└────────────────────────────────┘
```

### ⚪ Desconectado
```
┌──────────────────────────────┐
│ Medilink  [○ Desconectado]  │
└──────────────────────────────┘
```

### ⏳ Cargando
```
┌──────────────────────────────┐
│ Medilink  [⟳ Cargando...]   │
└──────────────────────────────┘
```

## 🔧 Funciones de los Botones

### "Conectar Medilink"
- Envía token al backend
- Realiza smoke test automático
- Cifra y guarda token
- Muestra resultado

### "Probar Conexión"
- Valida token actual
- Verifica acceso a API
- Actualiza estado
- Muestra errores si hay

### "Actualizar Estado"
- Refresca información
- Actualiza fecha de última conexión
- Muestra errores recientes

### "Desconectar Medilink"
- Marca integración como revoked
- Requiere confirmación
- No elimina datos históricos

## 💡 Tips de UX

✨ **Hover Effects**
- Card cambia color al pasar el mouse
- Botones tienen feedback visual

✨ **Loading States**
- Spinners en botones durante operaciones
- Skeleton loaders en listas
- Deshabilita controles durante carga

✨ **Error Handling**
- Mensajes claros y en español
- Alertas contextuales
- Sugerencias de solución

✨ **Validaciones**
- En tiempo real
- Mensajes debajo de cada campo
- Previene envíos inválidos

## 📱 Responsive Design

La interfaz se adapta a:
- 💻 Desktop (óptimo)
- 📱 Tablet (funcional)
- 📱 Mobile (básico)

## ♿ Accesibilidad

- ✅ Labels en todos los campos
- ✅ ARIA labels
- ✅ Keyboard navigation
- ✅ Screen reader friendly
- ✅ Contrast ratio WCAG AA

## 🎨 Componentes UI Usados

- `Card` - Contenedores
- `Dialog` - Modal principal
- `Tabs` - Navegación interna
- `Form` - Formularios con validación
- `Input` - Campos de texto
- `Select` - Dropdowns
- `Button` - Acciones
- `Badge` - Estados
- `Alert` - Mensajes
- `ScrollArea` - Listas largas
- `Tooltip` - Ayuda contextual

## 🔍 Explorar Catálogos

Una vez conectado, puedes explorar:

1. **Sucursales**
   - Lista completa
   - Dirección
   - ID para referencia

2. **Profesionales**
   - Click en sucursal
   - Ver médicos disponibles
   - Especialidades

3. **Información**
   - Rate limit configurado
   - Última conexión
   - Errores recientes

## ⌨️ Atajos de Teclado

- `ESC` - Cerrar modal
- `Enter` - Enviar formulario
- `Tab` - Navegar entre campos

## 🆘 Troubleshooting UI

### Modal no abre
- Verifica que el hook `useMedilink` esté funcionando
- Revisa console del navegador

### No se conecta
- Verifica token en Medilink
- Revisa que el backend esté corriendo
- Confirma variables de entorno

### No se ven sucursales
- Espera a que cargue
- Verifica conexión de red
- Prueba botón "Actualizar"

---

**¡La UI está lista y es super intuitiva!** 🎉

