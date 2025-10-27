-- Assign admin role to benyahya.otmane@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'benyahya.otmane@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;