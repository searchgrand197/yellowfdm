"""Effective shop open/closed status from daily hours + manual override."""

from __future__ import annotations

from datetime import datetime, timedelta

from django.utils import timezone


def _combine(day, t):
    return timezone.make_aware(datetime.combine(day, t), timezone.get_current_timezone())


def next_opens_at(shop, now=None):
    """Next datetime the shop should open based on daily schedule / reopens_at."""
    now = now or timezone.now()
    local = timezone.localtime(now)
    candidates = []

    if shop.reopens_at and shop.reopens_at > now:
        candidates.append(shop.reopens_at)

    if shop.opens_at:
        today_open = _combine(local.date(), shop.opens_at)
        if today_open > now:
            candidates.append(today_open)
        else:
            candidates.append(today_open + timedelta(days=1))

    if not candidates:
        return shop.reopens_at
    return min(candidates)


def within_daily_hours(shop, now=None) -> bool:
    if not shop.opens_at or not shop.closes_at:
        return True  # no schedule → hours don't restrict
    now = now or timezone.now()
    local = timezone.localtime(now)
    t = local.time()
    opens = shop.opens_at
    closes = shop.closes_at
    if opens <= closes:
        return opens <= t < closes
    # Overnight window (e.g. 20:00–02:00)
    return t >= opens or t < closes


def effective_shop_payload(shop, now=None) -> dict:
    """Public-facing shop status used by /api/config/ and the closed gate."""
    now = now or timezone.now()
    scheduled_ok = within_daily_hours(shop, now)

    # Manual force-close: is_open False. Outside daily hours also closed.
    is_open = bool(shop.is_open) and scheduled_ok

    reopens = None
    if not is_open:
        reopens = next_opens_at(shop, now)
        # If force-closed without schedule/reopens, keep stored reopens_at
        if reopens is None and shop.reopens_at:
            reopens = shop.reopens_at

    return {
        'is_open': is_open,
        'reopens_at': reopens.isoformat() if reopens else None,
        'closed_message': shop.closed_message,
        'opens_at': shop.opens_at.strftime('%H:%M') if shop.opens_at else None,
        'closes_at': shop.closes_at.strftime('%H:%M') if shop.closes_at else None,
        'updated_at': shop.updated_at.isoformat() if shop.updated_at else None,
        'manual_open': shop.is_open,
    }
