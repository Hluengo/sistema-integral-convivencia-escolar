---
name: gitflow
description: Gestiona ramas, merges, releases con flujo GitFlow. Trigger: git, rama, merge, release, develop, feature.
---

# GitFlow

Flujo de trabajo con ramas para desarrollo organizado.

## Estructura de Ramas

```
main (producción)
  └── develop (integración)
       ├── feature/nombre
       ├── feature/nombre
       └── release/1.0.0
            └── hotfix/corregir
```

## Flujo

### 1. Nueva Funcionalidad
```bash
git checkout develop
git checkout -b feature/nueva-funcionalidad
# ... desarrollo ...
git add .
git commit -m "feat: descripción"
git checkout develop
git merge --no-ff feature/nueva-funcionalidad
git branch -d feature/nueva-funcionalidad
```

### 2. Release
```bash
git checkout develop
git checkout -b release/1.0.0
# ... preparación ...
git checkout main
git merge --no-ff release/1.0.0
git tag -a v1.0.0 -m "Release 1.0.0"
git checkout develop
git merge --no-ff release/1.0.0
```

### 3. Hotfix
```bash
git checkout main
git checkout -b hotfix/corregir-bug
# ... corrección ...
git checkout main
git merge --no-ff hotfix/corregir-bug
git tag -a v1.0.1 -m "Hotfix 1.0.1"
git checkout develop
git merge --no-ff hotfix/corregir-bug
```

## Reglas
- `main` siempre desplegable
- `develop` integración continua
- Feature branches desde `develop`
- Hotfix desde `main`
- Tags en releases

## Comandos Relacionados
- `@github` para GitHub
- `@gitflow` para flujo de ramas
- `@devops` para CI/CD
