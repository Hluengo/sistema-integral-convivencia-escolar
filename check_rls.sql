SELECT schemaname, tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('inspectorate_records', 'students', 'courses', 'causas', 'cartas_disciplinarias', 'etapas_disciplinarias')
ORDER BY tablename, policyname;
