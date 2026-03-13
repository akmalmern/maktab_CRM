# Rollback Plan

## Triggerlar
- migrationdan keyin `/ready` `503`
- auth yoki finance/payroll smoke yiqilishi
- data corruption yoki noto'g'ri ledger semantikasi

## Qadamlar
1. Yangi trafficni to'xtating.
2. Joriy release commit SHA sini qayd qiling.
3. Avvalgi barqaror image tagga qayting.
4. Agar migration backward-compatible bo'lmasa, DB snapshot restore qiling.
5. Restore bo'lgach:
```bash
node tools/release-smoke.mjs
```
6. Health va business smoke yashil bo'lsa trafficni qayta oching.

## Nimalarni rollback qilmaysiz
- ad-hoc prod hotfixni tekshirmasdan qayta yozmang
- partial DB restore bilan yarim holat qoldirmang

## Minimal rollback artefaktlari
- oldingi Docker image tag
- DB snapshot
- `.env` / secret version
- migration ro'yxati

## Qaror daraxti
- Kod xato, DB sog'lom -> image rollback
- Migration xato, schema buzilgan -> image rollback + DB restore
- Monitoring-only xato -> trafficni to'xtatmasdan token/config fix
