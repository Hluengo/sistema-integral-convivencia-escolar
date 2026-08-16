---
name: powershell
description: Scripts PowerShell para automatización Windows, tareas de sistema. Trigger: PowerShell, script, Windows, automatización,sistema.
---

# PowerShell Automation

Guía para scripts PowerShell robustos.

## Estructura de Script

```powershell
<#
.SYNOPSIS
    Descripción del script
.DESCRIPTION
    Descripción detallada
.NOTES
    Autor: [nombre]
    Fecha: [fecha]
#>

#Requires -Version 7.0
#Set-StrictMode -Version Latest

param(
    [Parameter(Mandatory=$true)]
    [string]$Param1,

    [Parameter(Mandatory=$false)]
    [switch]$Verbose
)

try {
    # Código principal
    Write-Host "Iniciando..." -ForegroundColor Green
}
catch {
    Write-Error "Error: $_"
    exit 1
}
finally {
    Write-Host "Finalizado." -ForegroundColor Yellow
}
```

## Patrones Comunes

### Archivos
```powershell
# Leer
$contenido = Get-Content -Path "archivo.txt" -Encoding UTF8

# Escribir
$contenido | Set-Content -Path "resultado.txt" -Encoding UTF8

# Buscar archivos
Get-ChildItem -Path "C:\docs" -Recurse -Filter "*.xlsx"
```

### APIs
```powershell
# GET
$response = Invoke-RestMethod -Uri $url -Method Get

# POST
$body = @{ key = "value" } | ConvertTo-Json
Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
```

### Procesos
```powershell
# Ejecutar programa
Start-Process -FilePath "python" -ArgumentList "script.py" -Wait

# Servicios
Get-Service -Name "wuauserv" | Restart-Service
```

### Seguridad
```powershell
# Credenciales
$cred = Get-Credential

# Encriptar
$encrypted = ConvertTo-SecureString "texto" -AsPlainText -Force
```

## Convenciones
- Siempre usar `-Encoding UTF8`
- Manejar errores con try/catch
- Usar `-WhatIf` para preview
- Documentar con comentarios
- Usar parámetros param()

## Comandos Relacionados
- `@powershell` para scripts Windows
- `@devops` para automatización
- `@python` para scripts multiplataforma
