from django.utils import timezone
from datetime import timedelta


def compute_compliance_rate(medication, days: int = 30) -> float:
    """Return compliance percentage (0-100) over a window of days based on logs vs expected doses."""
    now = timezone.now()
    since = now - timedelta(days=days)
    expected_per_day = _expected_doses_per_day(medication.frequency)
    days_on_medication = max(0, min(days, (now.date() - medication.start_date).days))
    if days_on_medication <= 0:
        return 100.0
    expected_doses = max(1, days_on_medication * expected_per_day)
    actual_logs = medication.logs.filter(taken_at__gte=since).count()
    compliance_rate = min((actual_logs / expected_doses) * 100, 100)
    return round(compliance_rate, 1)


def _expected_doses_per_day(frequency: str) -> int:
    f = (frequency or '').lower()
    if 'once' in f or '1' in f:
        return 1
    if 'twice' in f or '2' in f:
        return 2
    if 'three' in f or '3' in f:
        return 3
    if 'four' in f or '4' in f:
        return 4
    return 1


def compute_noncompliance_risk(medication) -> float:
    """
    Simple rule-based non-compliance risk model.
    Returns a score between 0 and 1 where higher means higher risk of non-compliance.

    Features considered:
    - Recent compliance ratio (last 14 days actual vs expected logs)
    - Days since last log (staleness)
    - Remaining quantity vs threshold (refill risk)
    - Start/end recency
    - Next due date passed
    """
    now = timezone.now()

    # 1) Recent adherence
    window_days = 14
    since = now - timedelta(days=window_days)
    expected_per_day = _expected_doses_per_day(medication.frequency)
    days_on = max(0, min(window_days, (now.date() - medication.start_date).days))
    expected_doses = max(1, days_on * expected_per_day)
    actual_logs = medication.logs.filter(taken_at__gte=since).count()
    adherence = min(actual_logs / expected_doses, 1.0)
    adherence_risk = 1 - adherence  # lower adherence -> higher risk

    # 2) Staleness: days since last log
    last_log = medication.logs.first()
    if last_log:
        days_since_last = (now - last_log.taken_at).days
    else:
        days_since_last = window_days + 1  # no logs -> stale
    staleness_risk = min(days_since_last / (window_days * 1.5), 1.0)

    # 3) Refill risk
    if medication.remaining_quantity is not None and medication.refill_threshold is not None:
        if medication.remaining_quantity <= 0:
            refill_risk = 1.0
        else:
            # normalize: threshold or less -> high risk
            refill_risk = max(0.0, min(1.0, 1 - (medication.remaining_quantity / max(1, medication.refill_threshold * 2))))
    else:
        refill_risk = 0.0

    # 4) Overdue next_due
    overdue_risk = 0.0
    if getattr(medication, 'next_due', None):
        overdue_days = (now.date() - medication.next_due).days
        if overdue_days > 0:
            overdue_risk = min(overdue_days / 7.0, 1.0)

    # Weighted combination
    # Emphasize adherence and staleness, then refill and overdue
    score = (
        0.4 * adherence_risk +
        0.3 * staleness_risk +
        0.2 * refill_risk +
        0.1 * overdue_risk
    )
    return max(0.0, min(1.0, float(score)))


def next_followup_time(risk_score: float) -> timezone.datetime:
    """Return a due_at based on risk score: higher risk -> sooner follow-up."""
    now = timezone.now()
    if risk_score >= 0.7:
        return now + timedelta(hours=6)
    if risk_score >= 0.5:
        return now + timedelta(hours=24)
    if risk_score >= 0.3:
        return now + timedelta(days=3)
    return now + timedelta(days=7)


def evaluate_and_create_followups_for_medications(queryset, created_by=None):
    """
    Evaluate medications in queryset and create follow-ups when rules trigger.
    Returns a dict with counts per reason.
    Rules:
    - High risk score (>= 0.7) -> HIGH_RISK
    - Needs refill -> REFILL_NEEDED
    - No logs in 7 days -> NO_LOGS
    - Compliance rate < 80% (30-day window) -> LOW_COMPLIANCE
    Avoid duplicate pending follow-ups for the same medication+reason created in the last 48 hours.
    """
    from .models import ComplianceFollowUp
    counts = {r: 0 for r, _ in ComplianceFollowUp.Reason.choices}
    now = timezone.now()
    recent_cutoff = now - timedelta(hours=48)

    for m in queryset:
        # Skip inactive meds (beyond end_date if specified)
        if getattr(m, 'end_date', None) and m.end_date < now.date():
            continue

        score = compute_noncompliance_risk(m)
        comp_rate = compute_compliance_rate(m, days=30)

        def already_pending(reason: str) -> bool:
            return m.followups.filter(
                reason=reason,
                status=ComplianceFollowUp.Status.PENDING,
                created_at__gte=recent_cutoff,
            ).exists()

        # High risk
        if score >= 0.7 and not already_pending(ComplianceFollowUp.Reason.HIGH_RISK):
            ComplianceFollowUp.objects.create(
                patient=m.patient,
                medication=m,
                due_at=next_followup_time(score),
                status=ComplianceFollowUp.Status.PENDING,
                reason=ComplianceFollowUp.Reason.HIGH_RISK,
                notes='Auto-generated due to high non-compliance risk.',
                created_by=created_by,
                risk_score_snapshot=score,
            )
            counts[ComplianceFollowUp.Reason.HIGH_RISK] += 1

        # Refill needed
        if getattr(m, 'remaining_quantity', None) is not None and m.remaining_quantity <= max(0, m.refill_threshold):
            if not already_pending(ComplianceFollowUp.Reason.REFILL_NEEDED):
                ComplianceFollowUp.objects.create(
                    patient=m.patient,
                    medication=m,
                    due_at=now + timedelta(hours=24),
                    status=ComplianceFollowUp.Status.PENDING,
                    reason=ComplianceFollowUp.Reason.REFILL_NEEDED,
                    notes='Auto-generated refill reminder.',
                    created_by=created_by,
                    risk_score_snapshot=score,
                )
                counts[ComplianceFollowUp.Reason.REFILL_NEEDED] += 1

        # No logs
        last_log = m.logs.first()
        no_logs_days = 999
        if last_log:
            no_logs_days = (now - last_log.taken_at).days
        if no_logs_days >= 7 and not already_pending(ComplianceFollowUp.Reason.NO_LOGS):
            ComplianceFollowUp.objects.create(
                patient=m.patient,
                medication=m,
                due_at=now + timedelta(hours=24),
                status=ComplianceFollowUp.Status.PENDING,
                reason=ComplianceFollowUp.Reason.NO_LOGS,
                notes='Auto-generated due to no recent intake logs.',
                created_by=created_by,
                risk_score_snapshot=score,
            )
            counts[ComplianceFollowUp.Reason.NO_LOGS] += 1

        # Low compliance
        if comp_rate < 80 and not already_pending(ComplianceFollowUp.Reason.LOW_COMPLIANCE):
            ComplianceFollowUp.objects.create(
                patient=m.patient,
                medication=m,
                due_at=now + timedelta(days=2),
                status=ComplianceFollowUp.Status.PENDING,
                reason=ComplianceFollowUp.Reason.LOW_COMPLIANCE,
                notes=f'Auto-generated: 30-day compliance {comp_rate}%.',
                created_by=created_by,
                risk_score_snapshot=score,
            )
            counts[ComplianceFollowUp.Reason.LOW_COMPLIANCE] += 1

    return counts

