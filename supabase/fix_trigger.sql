-- Drop and recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  email_domain text;
  org_id uuid;
  blocked_domains text[] := ARRAY[
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
    'icloud.com', 'aol.com', 'protonmail.com', 'mail.com',
    'yandex.com', 'zoho.com', 'gmx.com', 'live.com',
    'msn.com', 'me.com', 'mac.com'
  ];
BEGIN
  -- Extract domain from email
  email_domain := lower(split_part(COALESCE(NEW.email, ''), '@', 2));

  -- Skip if no email
  IF email_domain = '' OR email_domain IS NULL THEN
    RETURN NEW;
  END IF;

  -- Block personal domains
  IF email_domain = ANY(blocked_domains) THEN
    RAISE EXCEPTION 'Personal email domains are not allowed. Please use your corporate email.';
  END IF;

  -- Create org if it doesn't exist
  INSERT INTO public.organizations (name, domain)
  VALUES (email_domain, email_domain)
  ON CONFLICT (domain) DO NOTHING;

  -- Get the org id
  SELECT id INTO org_id FROM public.organizations WHERE domain = email_domain;

  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, organization_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ),
    org_id
  );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, skip
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user error: % %', SQLERRM, SQLSTATE;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
