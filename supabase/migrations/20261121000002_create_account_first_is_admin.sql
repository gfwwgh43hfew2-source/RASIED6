-- أول مسجّل في النظام يصبح admin، والباقون user (يستدعيها register بمفتاح الخدمة فقط)
create function public.create_account(p_uid uuid, p_phone text, p_name text, p_company text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_company uuid; v_role text;
begin
  perform pg_advisory_xact_lock(7001);   -- يمنع سباق "أول مسجّل"
  v_role := case when exists (select 1 from public.profiles) then 'user' else 'admin' end;
  insert into public.companies(name, profile)
  values (p_company, jsonb_build_object('phone', p_phone, 'currency', 'ج.م'))
  returning id into v_company;
  insert into public.profiles(id, phone, full_name, company_id, role, company_role)
  values (p_uid, p_phone, p_name, v_company, v_role, 'owner');
  return v_role;
end $$;
revoke all on function public.create_account(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.create_account(uuid, text, text, text) to service_role;
