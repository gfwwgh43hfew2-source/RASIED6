# خلفية Supabase (مشروع RASIED6 — mfswkrbpxtbcowbrffpb)

تم تطبيق المخطط مباشرة على المشروع عبر الـ MCP باسم الهجرة `rasied_core_schema`.

- الجداول: companies, profiles, records, activity_days, login_events, push_subscriptions (كلها RLS)
- الدوال: heartbeat, record_login, admin_users, admin_set_status, admin_company_tables, company_staff, staff_update, push_public_key, push_subscribe
- Edge Functions: `register` (تسجيل شركة جديدة) و`staff` (إضافة/حذف/تغيير كلمة مرور موظف) — منشورتان على المشروع (verify_jwt=false لأن كل واحدة تتحقق من الهوية داخلياً).

## الأدمن
أول حساب يُسجَّل يصبح admin تلقائياً (دالة create_account). للترقية يدوياً لاحقاً:
update public.profiles set role = 'admin' where phone = '966XXXXXXXXX';
