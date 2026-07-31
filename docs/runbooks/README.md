# Orderia Pilot Runbook Dizini

Pilot ve üretim kararı yalnız kodun derlenmesine dayanmaz. Aşağıdaki belgeler release sahibinin
uygulayacağı zorunlu operasyon kapılarıdır:

- [PILOT_ROLLOUT.md](./PILOT_ROLLOUT.md): aşamalı dağıtım, go/no-go ve geri dönüş kararı
- [MIGRATION_RUNBOOK.md](./MIGRATION_RUNBOOK.md): Orderia v1 yedeğinin denetlenebilir aktarımı
- [MONITORING_ALERTS.md](./MONITORING_ALERTS.md): SLO, dashboard ve alarm eşikleri
- [INCIDENT_RECOVERY.md](./INCIDENT_RECOVERY.md): P0–P3 olay müdahalesi
- [BACKUP_RESTORE.md](./BACKUP_RESTORE.md): PostgreSQL, PITR ve Storage kurtarma tatbikatı
- [SECURITY_REVIEW.md](./SECURITY_REVIEW.md): tehdit modeli ve kabul edilen bağımlılık riski
- [REAL_DEVICE_MATRIX.md](./REAL_DEVICE_MATRIX.md): fiziksel cihaz sign-off matrisi

Bir kutunun doldurulmamış olması “geçti” anlamına gelmez. Dış sistem, gerçek cihaz ve gerçek garson
gerektiren kontroller tamamlanana kadar genel dağıtım blokludur.
