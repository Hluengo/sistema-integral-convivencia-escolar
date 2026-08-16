---
name: apps-script
description: Desarrolla Google Apps Script para automatizaciones Google Workspace. Trigger: Apps Script, Google, Sheets, Gmail, automatización.
---

# Google Apps Script

Guía para automatizaciones con Google Apps Script.

## Estructura de Proyecto

```javascript
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Función principal
function main() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  // Procesar datos
}

// Triggers
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Personalizado')
    .addItem('Ejecutar', 'main')
    .addToUi();
}
```

## APIs de Google

### Sheets
```javascript
const sheet = SpreadsheetApp.getActiveSheet();
const range = sheet.getRange('A1:B10');
const values = range.getValues();
range.setValues(newValues);
```

### Gmail
```javascript
GmailApp.sendEmail(email, subject, body);
GmailApp.search('from:example.com');
```

### Drive
```javascript
DriveApp.getFilesByName('archivo.xlsx');
DriveApp.createFolder('Carpeta');
```

### Calendar
```javascript
CalendarApp.getDefaultCalendar();
CalendarApp.createEvent(title, startTime, endTime);
```

## Despliegue
1. Abrir script.google.com
2. Crear proyecto
3. Pegar código
4. Configurar triggers
5. Autorizar permisos

## Comandos Relacionados
- `@appscript` para Google Apps Script
- `@python` para automatización general
- `@powershell` para Windows
