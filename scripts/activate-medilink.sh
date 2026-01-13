#!/bin/bash

# Script de activación rápida de Medilink
# Uso: ./scripts/activate-medilink.sh

set -e

echo "🚀 Activando integración de Medilink..."
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Ejecuta este script desde la raíz del monorepo${NC}"
    exit 1
fi

# Paso 1: Verificar que el módulo está habilitado
echo -e "${YELLOW}📁 Verificando estructura de archivos...${NC}"

if [ -d "apps/backend/src/modules/integrations/medilink.disabled" ]; then
    echo -e "${RED}❌ El módulo está desactivado. Activando...${NC}"
    cd apps/backend/src/modules/integrations
    mv medilink.disabled medilink
    cd -
fi

if [ -f "apps/backend/src/config/medilink.config.ts.disabled" ]; then
    cd apps/backend/src/config
    mv medilink.config.ts.disabled medilink.config.ts
    cd -
fi

echo -e "${GREEN}✅ Estructura de archivos OK${NC}"

# Paso 2: Verificar dependencias
echo -e "${YELLOW}📦 Verificando dependencias...${NC}"

cd apps/backend
if ! npm list bottleneck > /dev/null 2>&1; then
    echo -e "${YELLOW}⚙️  Instalando bottleneck...${NC}"
    npm install bottleneck
else
    echo -e "${GREEN}✅ Dependencias OK${NC}"
fi
cd -

# Paso 3: Verificar variables de entorno
echo -e "${YELLOW}🔑 Verificando variables de entorno...${NC}"

if [ ! -f "apps/backend/.env" ]; then
    echo -e "${RED}❌ No se encontró archivo .env${NC}"
    echo -e "${YELLOW}Crea un archivo .env en apps/backend/ con las siguientes variables:${NC}"
    echo ""
    echo "MEDILINK_ENCRYPTION_KEY_B64=<generar con: openssl rand -base64 32>"
    echo "MEDILINK_DEFAULT_BASE_URL=https://api.medilink.healthatom.com/api/v1"
    echo ""
    echo -e "${YELLOW}Ver ejemplo completo en:${NC}"
    echo "apps/backend/src/modules/integrations/medilink/medilink.env.example"
    exit 1
fi

# Verificar si existe la clave de encriptación
if ! grep -q "MEDILINK_ENCRYPTION_KEY_B64" apps/backend/.env; then
    echo -e "${YELLOW}⚠️  Falta MEDILINK_ENCRYPTION_KEY_B64 en .env${NC}"
    echo ""
    echo -e "${YELLOW}Genera una clave con:${NC}"
    echo "openssl rand -base64 32"
    echo ""
    read -p "¿Deseas que la genere automáticamente? (s/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        KEY=$(openssl rand -base64 32)
        echo "" >> apps/backend/.env
        echo "# Medilink" >> apps/backend/.env
        echo "MEDILINK_ENCRYPTION_KEY_B64=$KEY" >> apps/backend/.env
        echo -e "${GREEN}✅ Clave generada y agregada a .env${NC}"
    else
        echo -e "${RED}❌ Agrega manualmente MEDILINK_ENCRYPTION_KEY_B64 a .env${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Variables de entorno OK${NC}"
fi

# Paso 4: Ejecutar migraciones
echo -e "${YELLOW}🗄️  Ejecutando migraciones...${NC}"

cd apps/backend
npm run migration:run
cd -

echo -e "${GREEN}✅ Migraciones ejecutadas${NC}"

# Resumen
echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Medilink activado exitosamente!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📝 Próximos pasos:${NC}"
echo ""
echo "1. Crear plantillas en Meta Business Suite:"
echo "   https://business.facebook.com/wa/manage/message-templates/"
echo ""
echo "2. Obtener token de Medilink:"
echo "   Administrador → Configuración API → + Agregar cliente"
echo ""
echo "3. Conectar desde la UI:"
echo "   Configuración → Integraciones → Medilink → Pegar token"
echo ""
echo "4. Reiniciar la aplicación:"
echo "   npm run build && npm run start:prod"
echo ""
echo -e "${GREEN}📖 Documentación completa:${NC}"
echo "   apps/backend/src/modules/integrations/medilink/README.md"
echo ""
echo -e "${GREEN}🎉 ¡Listo para agendar citas médicas!${NC}"

