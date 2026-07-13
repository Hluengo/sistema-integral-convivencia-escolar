---
name: python-automation
description: Crea scripts Python para automatización, análisis de datos, procesamiento. Trigger: Python, script, automatización, datos, Análisis.
---

# Python Automation

Guía para scripts de automatización con Python.

## Estructura de Script

```python
#!/usr/bin/env python3
"""
@license
SPDX-License-Identifier: Apache-2.0
"""

import sys
from pathlib import Path

def main():
    """Función principal."""
    pass

if __name__ == "__main__":
    main()
```

## Dependencias Comunes
```bash
pip install pandas openpyxl requests beautifulsoup4
```

## Patrones

### Leer Excel
```python
import pandas as pd
df = pd.read_excel('archivo.xlsx')
```

### API Request
```python
import requests
response = requests.get(url, params=params)
data = response.json()
```

### Procesamiento de Datos
```python
# Filtrar
df_filtrado = df[df['columna'] > valor]

# Agrupar
agrupado = df.groupby('categoria').sum()

# Exportar
df_filtrado.to_excel('resultado.xlsx', index=False)
```

### Archivos
```python
from pathlib import Path
contenido = Path('archivo.txt').read_text(encoding='utf-8')
Path('resultado.txt').write_text(contenido, encoding='utf-8')
```

## Convenciones
- Usar virtualenv
- Documentar funciones
- Manejar errores con try/except
- Usar argparse para CLI
- Encoding: UTF-8

## Comandos Relacionados
- `@python` para desarrollo Python
- `@analytics` para análisis de datos
- `@powershell` para automatización Windows
