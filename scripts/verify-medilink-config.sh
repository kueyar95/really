#!/bin/bash

# ================================================
# Script de Verificación: Configuración Medilink
# ================================================
# 
# Este script verifica que la configuración de 
# Medilink esté correcta antes de conectar.
#
# Uso: bash scripts/verify-medilink-config.sh
# ================================================

set -e

echo ""
echo "🔍 Verificando Configuración de Medilink..."
echo "=============================================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
PASSED=0
FAILED=0
WARNINGS=0

# ================================================
# 1. Verificar Variable de Entorno Principal
# ================================================
echo "📋 1. Variable de Entorno Principal"
echo "-----------------------------------"

if [ -z "$MEDILINK_ENCRYPTION_KEY_B64" ]; then
    echo -e "${RED}❌ MEDILINK_ENCRYPTION_KEY_B64 no está configurada${NC}"
    echo ""
    echo "   💡 Solución:"
    echo "   export MEDILINK_ENCRYPTION_KEY_B64=gx5S1ZyN2qII1AM2r5EVqvppZBmCNBRkHik5mjCO2cY="
    echo ""
    FAILED=$((FAILED + 1))
else
    # Verificar longitud (debe ser ~44 caracteres en base64)
    KEY_LENGTH=${#MEDILINK_ENCRYPTION_KEY_B64}
    if [ $KEY_LENGTH -lt 40 ]; then
        echo -e "${RED}❌ La clave es muy corta ($KEY_LENGTH caracteres)${NC}"
        echo "   Debe ser ~44 caracteres en base64"
        FAILED=$((FAILED + 1))
    elif [ $KEY_LENGTH -gt 50 ]; then
        echo -e "${RED}❌ La clave es muy larga ($KEY_LENGTH caracteres)${NC}"
        echo "   Debe ser ~44 caracteres en base64"
        FAILED=$((FAILED + 1))
    else
        echo -e "${GREEN}✅ MEDILINK_ENCRYPTION_KEY_B64 configurada correctamente${NC}"
        echo "   Longitud: $KEY_LENGTH caracteres"
        PASSED=$((PASSED + 1))
    fi
fi

echo ""

# ================================================
# 2. Verificar Variables Opcionales
# ================================================
echo "📋 2. Variables Opcionales (pueden faltar)"
echo "------------------------------------------"

if [ -z "$MEDILINK_DEFAULT_BASE_URL" ]; then
    echo -e "${YELLOW}⚠️  MEDILINK_DEFAULT_BASE_URL no configurada (usará valor por defecto)${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ MEDILINK_DEFAULT_BASE_URL: $MEDILINK_DEFAULT_BASE_URL${NC}"
    PASSED=$((PASSED + 1))
fi

if [ -z "$MEDILINK_RATE_LIMIT_RPM" ]; then
    echo -e "${YELLOW}⚠️  MEDILINK_RATE_LIMIT_RPM no configurada (usará 20 por defecto)${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ MEDILINK_RATE_LIMIT_RPM: $MEDILINK_RATE_LIMIT_RPM${NC}"
    PASSED=$((PASSED + 1))
fi

if [ -z "$MEDILINK_SYNC_ENABLED" ]; then
    echo -e "${YELLOW}⚠️  MEDILINK_SYNC_ENABLED no configurada (usará false por defecto)${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ MEDILINK_SYNC_ENABLED: $MEDILINK_SYNC_ENABLED${NC}"
    PASSED=$((PASSED + 1))
fi

echo ""

# ================================================
# 3. Verificar Variables de WhatsApp
# ================================================
echo "📋 3. Variables de WhatsApp (opcionales)"
echo "----------------------------------------"

if [ -z "$WA_TEMPLATE_CITA_CREADA" ]; then
    echo -e "${YELLOW}⚠️  WA_TEMPLATE_CITA_CREADA no configurada (notificaciones deshabilitadas)${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ WA_TEMPLATE_CITA_CREADA: $WA_TEMPLATE_CITA_CREADA${NC}"
    PASSED=$((PASSED + 1))
fi

if [ -z "$WA_TEMPLATE_CITA_REAGENDADA" ]; then
    echo -e "${YELLOW}⚠️  WA_TEMPLATE_CITA_REAGENDADA no configurada${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ WA_TEMPLATE_CITA_REAGENDADA: $WA_TEMPLATE_CITA_REAGENDADA${NC}"
    PASSED=$((PASSED + 1))
fi

if [ -z "$WA_TEMPLATE_CITA_ANULADA" ]; then
    echo -e "${YELLOW}⚠️  WA_TEMPLATE_CITA_ANULADA no configurada${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ WA_TEMPLATE_CITA_ANULADA: $WA_TEMPLATE_CITA_ANULADA${NC}"
    PASSED=$((PASSED + 1))
fi

echo ""

# ================================================
# 4. Verificar Dependencias Node
# ================================================
echo "📋 4. Dependencias de Node.js"
echo "-----------------------------"

# Verificar si node_modules existe
if [ ! -d "node_modules" ]; then
    echo -e "${RED}❌ node_modules no encontrado${NC}"
    echo "   Ejecuta: npm install"
    FAILED=$((FAILED + 1))
else
    # Verificar dependencia bottleneck
    if [ ! -d "node_modules/bottleneck" ]; then
        echo -e "${RED}❌ Paquete 'bottleneck' no instalado${NC}"
        echo "   Ejecuta: npm install bottleneck"
        FAILED=$((FAILED + 1))
    else
        echo -e "${GREEN}✅ Paquete 'bottleneck' instalado${NC}"
        PASSED=$((PASSED + 1))
    fi
fi

echo ""

# ================================================
# 5. Verificar Estructura de Archivos
# ================================================
echo "📋 5. Estructura de Archivos del Módulo"
echo "---------------------------------------"

MEDILINK_DIR="apps/backend/src/modules/integrations/medilink"

if [ ! -d "$MEDILINK_DIR" ]; then
    echo -e "${RED}❌ Directorio de Medilink no encontrado: $MEDILINK_DIR${NC}"
    FAILED=$((FAILED + 1))
else
    echo -e "${GREEN}✅ Directorio de Medilink encontrado${NC}"
    PASSED=$((PASSED + 1))
    
    # Verificar archivos clave
    KEY_FILES=(
        "medilink.module.ts"
        "medilink.service.ts"
        "medilink.controller.ts"
        "medilink.client.ts"
        "utils/crypto.service.ts"
    )
    
    for file in "${KEY_FILES[@]}"; do
        if [ ! -f "$MEDILINK_DIR/$file" ]; then
            echo -e "${RED}   ❌ Falta: $file${NC}"
            FAILED=$((FAILED + 1))
        fi
    done
fi

echo ""

# ================================================
# 6. Verificar Migraciones
# ================================================
echo "📋 6. Migraciones de Base de Datos"
echo "-----------------------------------"

MIGRATION_FILE="apps/backend/src/database/migrations/1729200000000-CreateMedilinkTables.ts"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Migración de Medilink no encontrada${NC}"
    FAILED=$((FAILED + 1))
else
    echo -e "${GREEN}✅ Migración de Medilink encontrada${NC}"
    PASSED=$((PASSED + 1))
fi

echo ""

# ================================================
# Resumen Final
# ================================================
echo "=============================================="
echo "📊 Resumen de Verificación"
echo "=============================================="
echo ""
echo -e "${GREEN}✅ Pasadas:    $PASSED${NC}"
echo -e "${YELLOW}⚠️  Advertencias: $WARNINGS${NC}"
echo -e "${RED}❌ Fallidas:   $FAILED${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ VERIFICACIÓN FALLIDA${NC}"
    echo ""
    echo "Hay $FAILED problema(s) crítico(s) que deben resolverse antes de usar Medilink."
    echo ""
    echo "📖 Consulta:"
    echo "   - apps/backend/MEDILINK_ENV_SETUP.md"
    echo "   - GUIA_RAPIDA_MEDILINK.md"
    echo ""
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  VERIFICACIÓN COMPLETADA CON ADVERTENCIAS${NC}"
    echo ""
    echo "Todo lo crítico está configurado, pero hay $WARNINGS configuración(es) opcional(es) faltante(s)."
    echo "El sistema funcionará, pero con funcionalidad limitada."
    echo ""
    exit 0
else
    echo -e "${GREEN}✅ VERIFICACIÓN EXITOSA${NC}"
    echo ""
    echo "🎉 ¡Todas las configuraciones están correctas!"
    echo ""
    echo "Próximos pasos:"
    echo "  1. Asegúrate de tener un token de Medilink"
    echo "  2. Ve a la UI: Configuración → Integraciones"
    echo "  3. Click en 'Medilink'"
    echo "  4. Pega tu token y conecta"
    echo ""
    exit 0
fi

