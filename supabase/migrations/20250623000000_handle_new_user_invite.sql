-- handle_new_user — create org on signup OR join invited org
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  company_name text;
  invite_org_id text;
  skip_org boolean;
  invite_role text;
BEGIN
  invite_org_id := NEW.raw_user_meta_data->>'invite_org_id';
  skip_org := COALESCE((NEW.raw_user_meta_data->>'skip_org_creation')::boolean, false);

  IF skip_org AND invite_org_id IS NOT NULL AND invite_org_id <> '' THEN
    SELECT pi.role
    INTO invite_role
    FROM public.pending_invites pi
    WHERE pi.org_id = invite_org_id::uuid
      AND lower(pi.email) = lower(NEW.email)
      AND pi.accepted_at IS NULL
    ORDER BY pi.invited_at DESC
    LIMIT 1;

    INSERT INTO public.users (id, org_id, email, role)
    VALUES (
      NEW.id,
      invite_org_id::uuid,
      NEW.email,
      'member'
    );

    UPDATE public.pending_invites
    SET accepted_at = now()
    WHERE org_id = invite_org_id::uuid
      AND lower(email) = lower(NEW.email)
      AND accepted_at IS NULL;
  ELSE
    company_name := COALESCE(
      NEW.raw_user_meta_data->>'company_name',
      SPLIT_PART(NEW.email, '@', 1)
    );

    INSERT INTO public.organizations (name, plan, documents_limit, documents_used)
    VALUES (company_name, 'free', 3, 0)
    RETURNING id INTO new_org_id;

    INSERT INTO public.users (id, org_id, email, role)
    VALUES (NEW.id, new_org_id, NEW.email, 'owner');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
