// En el dashboard de Supabase:                                                                  
                                                            
//   - Funciones: Database > Functions                                                             
//   - Triggers: Database > Triggers        
                                                                                                
//   Aunque más completo es ir a SQL Editor y correr estas queries:                                

//   -- Ver todos los triggers
//   SELECT trigger_name, event_manipulation, event_object_table, action_statement
//   FROM information_schema.triggers
//   WHERE trigger_schema = 'public' OR event_object_schema = 'auth';

//   -- Ver todas las funciones custom
//   SELECT routine_name, routine_definition
//   FROM information_schema.routines
//   WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';

//   Eso te da todo en texto que podés copiar y pegar acá.