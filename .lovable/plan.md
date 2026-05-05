## Promote pandeyvishwajeet61@gmail.com to admin

Your account exists in auth (id `30af4d54-6434-4d0f-b39c-dfb837430b89`), but no `profiles` row or `user_roles` row was created on signup — the `handle_new_user` function exists but is not attached as a trigger to `auth.users`. I'll fix both your account and the underlying cause.

### Steps

1. **Insert your profile + admin role** (one-time data fix)
   - INSERT into `public.profiles` (id, full_name, email)
   - INSERT into `public.user_roles` (user_id, role='admin')

2. **Attach the missing trigger** (migration) so future signups auto-create profile + default `student` role:
   ```sql
   CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
   ```

3. **Backfill any other existing auth users** missing a profile/role with the same logic.

After this, log out and back in — you'll have admin access to Masters and `/admin/users`.