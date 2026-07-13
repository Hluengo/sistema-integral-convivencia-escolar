---
name: github
description: Gestiona repositorios GitHub: PRs, issues, actions, code review. Trigger: GitHub, PR, issue, pull request, repository.
---

# GitHub Skill

Guía completa para trabajar con GitHub.

## Comandos Git

### Flujo Básico
```bash
git add .
git commit -m "tipo: descripción"
git push origin main
```

### Ramas
```bash
git checkout -b feature/nueva-funcionalidad
git checkout -b fix/corregir-bug
git checkout -b hotfix/urgente
```

### PR
```bash
git push origin mi-branch
# Luego crear PR en GitHub
```

## Convenciones de Commits

### Formato
```
tipo: descripción corta

[opcional] cuerpo más detallado

[opcional] footer
```

### Tipos
- `feat:` nueva funcionalidad
- `fix:` corrección de bug
- `docs:` documentación
- `style:` formato (no afecta código)
- `refactor:` refactoring
- `test:` tests
- `chore:` mantenimiento

### Ejemplos
```bash
git commit -m "feat: agregar validación de RUN"
git commit -m "fix: corregir cálculo de plazos"
git commit -m "docs: actualizar README"
```

## GitHub CLI
```bash
# Ver issues
gh issue list

# Crear issue
gh issue create --title "Bug" --body "Descripción"

# Ver PRs
gh pr list

# Crear PR
gh pr create --title "Feature" --body "Descripción"

# Merge PR
gh pr merge 123
```

## Comandos Relacionados
- `@gitflow` para flujo de ramas
- `@devops` para CI/CD
- `@reviewer` para code review
