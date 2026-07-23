# Plan de Purga de PII en Historial de Git

**Estado:** Pendiente de aprobación y ejecución
**Fecha:** 2026-07-23
**Autor:** Staff Engineer (opencode)

---

## Resumen Ejecutivo

El commit `ddbd21d` en `origin/master` contiene 7 archivos con datos sensibles (PII) que permanecen en el historial de Git. Los archivos fueron removidos del tracking en commit `d9a1ec4`, pero el historial preserva sus contenidos. Se requiere purga del historial para eliminar permanentemente estos datos.

---

## Archivos Objetivo (en commit `ddbd21d`)

| Archivo | Tipo | Riesgo |
|---------|------|--------|
| `ANCALAO 1MA.pdf` | PDF estudiante | **CRÍTICO** — PII estudiantil |
| `APABLAZA 7BA.md` | Markdown estudiante | **CRÍTICO** — PII estudiantil |
| `.playwright-mcp/page-*.yml` (5 archivos) | Metadatos Playwright | **MEDIO** — URLs, estructura de UI |
| `.playwright-mcp/page-*.png` (1 archivo) | Screenshot | **MEDIO** — Captura de pantalla |

---

## Opciones de Purga

### Opción A: BFG Repo-Cleaner (Recomendada)

```bash
# 1. Clonar espejo del repo
git clone --mirror https://github.com/<owner>/<repo>.git repo-mirror.git
cd repo-mirror.git

# 2. Ejecutar BFG para eliminar archivos específicos
java -jar bfg.jar --delete-files "ANCALAO*"
java -jar bfg.jar --delete-files "APABLAZA*"
java -jar bfg.jar --delete-files "*.pdf"
java -jar bfg.jar --delete-files "*.png"
java -jar bfg.jar --delete-files "*.docx"
java -jar bfg.jar --delete-files "*.xlsx"
java -jar bfg.jar --delete-folder ".playwright-mcp"

# 3. Limpiar y push
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force-with-lease
```

**Ventajas:** Más rápido que git filter-repo, maneja bien archivos binarios.
**Desventajas:** Requiere Java, rewrite del historial completo.

### Opción B: git filter-repo

```bash
# Instalar: pip install git-filter-repo
git filter-repo --path AÑCALAO\ 1MA.pdf --invert-paths
git filter-repo --path APABLAZA\ 7BA.md --invert-paths
git filter-repo --path .playwright-mcp/ --invert-paths
git filter-repo --path "*.pdf" --invert-paths
git filter-repo --path "*.png" --invert-paths
git push --force-with-lease
```

**Ventajas:** Más preciso, no requiere Java.
**Desventajas:** Más lento con archivos binarios grandes.

### Opción C: Recrear Repositorio

1. Crear nuevo repo en GitHub
2. Push solo el árbol actual (sin historial)
3. Redirigir colaboradores al nuevo repo
4. Archivar el antiguo

**Ventajas:** Eliminación garantizada, historial limpio.
**Desventajas:** Pierde historial completo, PRs/issues, blames.

---

## Pasos Pre-Purga

1. **Notificar al equipo** — Todos los colaboradores deben hacer backup de ramas locales
2. **Cerrar PRs abiertos** — Reabrir después de la purga
3. **Verificar .gitignore** — Confirmar que patrones sensibles están bloqueados (✅ ya hecho)
4. **Hacer backup** — `git clone` del estado actual antes de purgar

## Pasos Post-Purga

1. **Verificar** — Clonar fresco y confirmar que los archivos no existen en el historial
2. **Reabrir PRs** — Los PRs abiertos necesitarán rebase
3. **Notificar** — Informar a colaboradores que deben pull fresh
4. **Rotar secrets** — Si algún secret fue expuesto, rotar inmediatamente

---

## Decisión Pendiente

**¿Ejecutar purga?** Requiere aprobación explícita del usuario.

- [ ] Aprobar Opción A (BFG)
- [ ] Aprobar Opción B (filter-repo)
- [ ] Aprobar Opción C (recrear repo)
- [ ] Postponer (mantener limpieza solo en working tree)
