-- إضافة حالة الحجز
alter table bookings add column if not exists status text not null default 'pending';

-- حذف سياسات الإدارة القديمة إن وجدت
DROP POLICY IF EXISTS "Admin can view bookings" ON bookings;
DROP POLICY IF EXISTS "Admin can update bookings" ON bookings;

-- صلاحيات حساب الإدارة
CREATE POLICY "Admin can view bookings"
ON bookings FOR SELECT
TO authenticated
USING ((auth.jwt() ->> 'email') = 'ahmadalfrehat505@gmail.com');

CREATE POLICY "Admin can update bookings"
ON bookings FOR UPDATE
TO authenticated
USING ((auth.jwt() ->> 'email') = 'ahmadalfrehat505@gmail.com')
WITH CHECK ((auth.jwt() ->> 'email') = 'ahmadalfrehat505@gmail.com');
