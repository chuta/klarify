-- 015_fix_notification_rls.sql
-- notification_preferences used auth.uid() which Prisma connections do not set.
-- Align with the rest of the app: public.current_user_id() via set_config GUC.

DROP POLICY IF EXISTS notification_preferences_self ON public.notification_preferences;

CREATE POLICY notification_preferences_self ON public.notification_preferences
  FOR ALL
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());
