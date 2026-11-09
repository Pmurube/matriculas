-- Matrículas · Seed de insignias y configuración (idempotente).
-- Las palabras se cargan aparte: supabase/seed/words.sql (generado) o `npm run words:push`.

insert into public.achievements (id, name, description, kind, config, sort_order) values
  ('primera_marcha', 'Primera marcha', 'Completa tu primera partida.', 'progress', '{}', 10),
  ('sin_calarse', 'Sin calarse', '10 aciertos consecutivos.', 'progress', '{}', 20),
  ('larga_distancia', 'Larga distancia', 'Una palabra de 10 letras o más.', 'progress', '{}', 30),
  ('hora_punta', 'Hora punta', 'Resuelve 15 matrículas en Contrarreloj.', 'progress', '{}', 40),
  ('sin_gps', 'Sin GPS', 'Completa Clásico sin pasar.', 'progress', '{}', 50),
  ('matricula_de_honor', 'Matrícula de honor', 'Supera el umbral de puntos configurado.', 'progress', '{"threshold": 100}', 60),
  ('coleccionista', 'Coleccionista', 'Usa A, E, I, O y U en una misma palabra.', 'progress', '{}', 70),
  ('campeon_diario_contrarreloj', 'Campeón diario Contrarreloj', 'Nº 1 del día en Contrarreloj.', 'competitive', '{}', 110),
  ('campeon_mensual_contrarreloj', 'Campeón mensual Contrarreloj', 'Nº 1 del mes en Contrarreloj.', 'competitive', '{}', 120),
  ('campeon_diario_clasico', 'Campeón diario Clásico', 'Nº 1 del día en Clásico.', 'competitive', '{}', 130),
  ('campeon_historico_clasico', 'Campeón histórico Clásico', 'Nº 1 histórico en Clásico.', 'competitive', '{}', 140)
on conflict (id) do update
  set name = excluded.name,
      description = excluded.description,
      kind = excluded.kind,
      sort_order = excluded.sort_order;
-- (config no se sobrescribe para no pisar umbrales editados)

-- Bonus de consonantes raras: todas a 0 (sin decidir). Editar en Supabase Studio:
--   update public.rare_consonant_config set bonus = 2 where consonant in ('x','w','k');
insert into public.rare_consonant_config (consonant, bonus)
select c, 0
from unnest(array['b','c','d','f','g','h','j','k','l','m','n','ñ','p','q','r','s','t','v','w','x','y','z']) as c
on conflict (consonant) do nothing;
