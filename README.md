# MAD Store — Production v5 (Fixed)

نسخة موحّدة ومصححة للنشر على GitHub وVercel.

## ما تم إصلاحه
- إزالة الـ rewrite العام القديم من `vercel.json` والاعتماد على اكتشاف Express في Vercel.
- منع انهيار التطبيق أثناء التحميل إذا كانت متغيرات البيئة ناقصة؛ الواجهة تفتح وواجهات API تعطي خطأ إعداد واضحًا بدل إيقاف العملية.
- إضافة تهيئة تلقائية لقاعدة Neon PostgreSQL في `db.js`، بما فيها جداول المستخدمين والجلسات والمنتجات والطلبات والإعدادات وسجل التدقيق.
- إضافة إعدادات افتراضية أولية للمتجر عند أول اتصال بقاعدة البيانات.
- الإبقاء على تحقق Moyasar الخلفي قبل اعتماد الطلب وإنقاص المخزون.

## متغيرات Vercel المطلوبة
أضفها من: Project → Settings → Environment Variables

- `DATABASE_URL`
- `ADMIN_TOKEN` — قيمة طويلة وعشوائية، ولا تستخدم القيمة الافتراضية.
- `SESSION_SECRET` — قيمة طويلة وعشوائية، ولا تستخدم القيمة الافتراضية.
- `PUBLIC_BASE_URL` — رابط المتجر النهائي، مثل `https://example.vercel.app`
- `MOYASAR_PUBLISHABLE_KEY`
- `MOYASAR_SECRET_KEY`

لا ترفع ملف `.env` إلى GitHub.

## بعد النشر
افتح:

`/api/health`

إذا كانت قاعدة البيانات تعمل سيظهر `ok: true`. وإذا لم تُضبط مفاتيح Moyasar سيظهر الدفع `awaiting_keys` إلى أن تضيفها.

## تشغيل محلي
```bash
npm install
npm start
```

## فحص JavaScript
```bash
npm run check
```
