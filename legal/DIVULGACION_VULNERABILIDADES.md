<!--
  POLÍTICA DE DIVULGACIÓN RESPONSABLE DE VULNERABILIDADES
  Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
  TODOS LOS DERECHOS RESERVADOS 2025-2026
-->

# Política de Divulgación Responsable de Vulnerabilidades

**Efectivo desde:** 23 de agosto de 2026

---

## 1. Propósito

NESGESFinance se compromete a mantener la seguridad de nuestra Plataforma. Esta política describe cómo reportar vulnerabilidades de forma responsable y cómo nos comprometemos a responder.

---

## 2. Alcance

Esta política cubre vulnerabilidades en:
- **Backend:** API REST, WebSocket, servicios internos
- **Frontend:** Interfaz web, JavaScript, aplicaciones browser
- **Infraestructura:** Servidores, base de datos, configuración
- **Procesos:** Autenticación, autorización, validación
- **Datos:** Encriptación, almacenamiento, transmisión

**No cubre:**
- Errores de tipografía o UI menores
- Problemas de rendimiento sin impacto de seguridad
- Vulnerabilidades en dependencias terceras (reportar al proveedor)
- Ataques de fuerza bruta o spam

---

## 3. Responsabilidades de Reporteros

### 3.1 Lo que SÍ debes hacer

✅ Reportar vulnerabilidades **solo a nosotros** (contacto privado)  
✅ Proporcionar detalles técnicos **específicos y reproductibles**  
✅ Incluir pasos para reproducir el error  
✅ Permitir tiempo **razonable** para investigación antes de divulgar  
✅ Mantener **confidencialidad** durante investigación  
✅ Cumplir **leyes aplicables** en tu jurisdicción  

### 3.2 Lo que NO debes hacer

❌ **NUNCA** publicar vulnerabilidades públicamente sin coordinar  
❌ **NUNCA** acceder a datos personales sin autorización  
❌ **NUNCA** modificar datos de terceros  
❌ **NUNCA** interrumpir servicios intencionalmente  
❌ **NUNCA** solicitar recompensa o extorsión  
❌ **NUNCA** usar nombre de NESGESFinance sin permiso  

**Violaciones pueden resultar en acción legal.**

---

## 4. Proceso de Reporte

### 4.1 Contacto Inicial

Reporta vulnerabilidades a **SOLO ESTE CANAL**:

📧 **security@nesgesfinance.org** (PREFERIDO)

**Alternativa (si email falla):**
📧 **info.nesgesfinance@gmail.com**  
📞 +1 (575) XXX-XXXX (disponible bajo demanda)

### 4.2 Contenido del Reporte

Incluye:

```
ASUNTO: [CRÍTICO/ALTO/MEDIO/BAJO] Vulnerabilidad: [Nombre corto]

1. DESCRIPCIÓN
   - Qué es el problema
   - Por qué es un riesgo de seguridad

2. IMPACTO
   - Qué puede hacer un atacante
   - Datos potencialmente en riesgo
   - Sistemas afectados

3. PASOS PARA REPRODUCIR
   - Paso 1: ...
   - Paso 2: ...
   - Resultado: ...

4. PRUEBA DE CONCEPTO (si es seguro compartir)
   - URL afectada
   - Parámetros o payload
   - Salida esperada vs. real

5. ENTORNO
   - Navegador/versión
   - SO
   - Otra información relevante

6. MITIGACIONES SUGERIDAS
   - (Opcional) Cómo podrían corregirse

INFORMACIÓN DE CONTACTO:
- Nombre: ...
- Email: ...
- Teléfono: ... (opcional)
- PGP Key: ... (opcional, para encriptación)
```

### 4.3 Encriptación

Recomendamos encriptar reportes sensibles con nuestra clave PGP:

```
-----BEGIN PGP PUBLIC KEY BLOCK-----
(Tu clave PGP aquí)
-----END PGP PUBLIC KEY BLOCK-----
```

Contáctanos para obtener nuestra clave actual.

---

## 5. Nuestro Compromiso de Respuesta

### 5.1 Cronograma

| Severidad | Reconocimiento | Investigación | Resolución Objetivo |
|-----------|---|---|---|
| Crítico | 24 horas | 72 horas | 7-14 días |
| Alto | 48 horas | 1 semana | 14-30 días |
| Medio | 1 semana | 2 semanas | 30-60 días |
| Bajo | 2 semanas | 3 semanas | 60-90 días |

### 5.2 Proceso de Respuesta

1. **Reconocimiento:** Confirmamos recepción del reporte
2. **Investigación:** Verificamos y evaluamos severidad
3. **Coordinación:** Discutimos hallazgos contigo
4. **Corrección:** Desarrollamos y probamos fix
5. **Validación:** Verificas que fix resuelve problema
6. **Divulgación Coordinada:** Publicamos información de vulnerabilidad

### 5.3 Comunicación

- Responderemos **solo a través del email de reporte**
- Usaremos **lenguaje técnico profesional**
- Seremos **transparentes** sobre progreso
- Solicitaremos **confirmación antes de divulgación pública**

---

## 6. Política de Divulgación

### 6.1 Coordinación

Una vez corregida la vulnerabilidad:

1. Te notificaremos con **detalles técnicos de la corrección**
2. Estableceremos **fecha de divulgación pública coordinada** (típicamente 30-90 días)
3. Publicaremos:
   - Descripción de la vulnerabilidad
   - Severidad y CVSS score
   - Afectados y solución
   - Crédito al reportero (si lo deseas)

### 6.2 Ejemplos de Divulgación

**Formato de comunicado:**
```
[FECHA] Vulnerabilidad en NESGESFinanceTrust [CVE-XXXX-XXXXX]

SEVERIDAD: Alto

Una vulnerabilidad XYZ en [componente] permitía a un atacante [impacto].

VERSIONES AFECTADAS:
- v3.4.0 a v3.4.x

SOLUCIÓN:
- Actualizar a v3.4.y o superior
- Aplicar patch de seguridad

CRÉDITO:
- Reportado por: [Tu nombre, si lo deseas]
- Equipo de seguridad de NESGESFinance

LÍNEA DE TIEMPO:
- 2026-08-23: Reporte recibido
- 2026-08-30: Investigación completada
- 2026-09-15: Parche publicado
- 2026-09-23: Divulgación pública
```

### 6.3 Excepciones a Divulgación Coordinada

Podemos divulgar sin coordinar si:
- Ya es público
- Un tercero lo divulgó sin nuestra autorización
- Lo requiere una autoridad legal

---

## 7. Recompensas por Vulnerabilidades (Bug Bounty)

### 7.1 Programa Actual

Actualmente NESGESFinanceTrust está en **etapa de auditoría**. No ofrecemos recompensas monetarias, pero sí:

- **Reconocimiento público** (con tu permiso)
- **Acceso prioritario** a nuevas funcionalidades
- **Descuentos** en servicios futuros (si aplica)
- **Inclusión en "Hall of Security Contributors"**

### 7.2 Programa Futuro

Cuando salgamos de auditoría, esperamos lanzar **programa formal de bug bounties** con:
- Recompensas monetarias (basadas en severidad)
- Cobertura de plataformas como HackerOne
- Términos formales de recompensa

Mantente atento a anuncios.

---

## 8. Protecciones Legales

### 8.1 Seguro Legal

Si reportas de buena fe conforme a esta política:
- **No perseguiremos** acción legal
- **No reportaremos** a autoridades por acceso no autorizado
- **No revocaremos** acceso por investigación de seguridad

### 8.2 Excepciones

Protecciones **NO aplican** si:
- Accediste a datos personales de terceros
- Modificaste datos o sistemas
- Violaste leyes criminales graves
- Usaste para extorsión o chantaje

### 8.3 Jurisdicción

Las protecciones están sujetas a leyes de:
- **Ecuador**
- **Nuevo México, EE.UU.**
- Tu jurisdicción local

Consulta abogado si tienes dudas legales.

---

## 9. Confidencialidad

Mantenemos **confidencialidad absoluta** de:
- Tu identidad (a menos que divulgues públicamente)
- Detalles técnicos de vulnerabilidad
- Fechas de investigación
- Comunicación privada

Podemos divulgar con **tu consentimiento previo** o si **lo requiere la ley**.

---

## 10. Exclusiones

**NO somos responsables por:**

- Vulnerabilidades reportadas después de divulgación pública
- Acceso no autorizado fuera de testeo de vulnerabilidad
- Daños causados por reportero durante investigación
- Fallos de comunicación por correo rechazado
- Retrasos causados por terceros (proveedores, plataformas)

---

## 11. Preguntas Frecuentes

### P: ¿Debo revelarme?
**R:** No es obligatorio, pero ayuda con coordinación. Podemos mantener anonimato.

### P: ¿Cuánto tiempo espero antes de divulgar públicamente?
**R:** Mínimo 30 días. Podemos extender si investigación continúa.

### P: ¿Qué si no responden en el tiempo indicado?
**R:** Contáctanos nuevamente. Si falla, puedes divulgar tras 90 días buena fe.

### P: ¿Recibiré actualización de estado?
**R:** Sí, comunicación cada semana (mínimo) durante investigación.

### P: ¿Puedo publicar antes si es urgente?
**R:** Contacta directamente a security@nesgesfinance.org. Evaluaremos caso por caso.

---

## 12. Contacto y Recursos

**Reporte de seguridad:**
📧 security@nesgesfinance.org

**Soporte técnico (no seguridad):**
📧 support@nesgesfinance.org

**Legal:**
📧 legal@nesgesfinance.org

**Clave PGP:**
https://nesgesfinance.org/security/pgp-key.asc

---

## 13. Cambios a Esta Política

Podemos actualizar esta política en cualquier momento. Cambios serán:
- Publicados en este documento
- Efectivos inmediatamente
- Aplicables a reportes futuros

---

**Versión:** 1.0  
**Última actualización:** 23 de agosto de 2026  
**Próxima revisión:** Anual o según cambios operativos

©NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872 — TODOS LOS DERECHOS RESERVADOS 2025-2026

---

**Agradecemos tu ayuda para mantener NESGESFinanceTrust seguro. 🔒**
