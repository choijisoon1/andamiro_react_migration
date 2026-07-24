-- 교환일기 비밀번호는 Edge Function만 읽고, 브라우저 역할에는 공개 필드만 허용한다.
revoke select on table public.exchange_posts from anon, authenticated;

grant select (
  id,
  user_id,
  title,
  content,
  image_url,
  read_count,
  created_at
) on table public.exchange_posts to authenticated;
