Ejecuta validaciones, revisa cambios, prepara commit y solicita confirmacion final antes de push.

Pasos:

1. Cargar agente release-manager
2. Revisar git status y git diff
3. Verificar ausencia de datos personales y secretos
4. Ejecutar quality gate completo
5. Preguntar al usuario: "Confirmas publicar estos cambios en master? (si/no)"
6. Si confirma: git add, git commit, git push
7. Verificar deploy en Vercel
8. Verificar URL productiva

No publicar sin confirmacion explicita del usuario.
