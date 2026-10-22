from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import Event, Registration


def reject(field, message):
    raise ValidationError({field: [message]})


def promote_waitlist(event):
    free = event.capacity - event.registrations.filter(
        status=Registration.ACTIVE
    ).count()
    if free <= 0:
        return []
    waiting = list(
        event.registrations.filter(status=Registration.WAITLIST)[:free]
    )
    for registration in waiting:
        registration.status = Registration.ACTIVE
        registration.save(update_fields=('status',))
    return waiting


def check_event_is_open(event):
    if event.is_cancelled:
        reject('event', 'Встреча отменена организатором.')
    if event.starts_at <= timezone.now():
        reject('event', 'Встреча уже началась, запись закрыта.')


@transaction.atomic
def join_event(event_id, cat, user):
    event = Event.objects.select_for_update().get(pk=event_id)
    check_event_is_open(event)
    if cat.owner_id != user.id:
        reject('cat', 'Записать на встречу можно только своего котика.')
    if event.registrations.filter(cat=cat).exists():
        reject('cat', 'Этот котик уже записан на встречу.')
    user_cats = event.registrations.filter(user=user).count()
    if user_cats >= event.max_cats_per_user:
        reject('cat', 'Организатор ограничил число котиков от одного '
                      f'хозяина: не больше {event.max_cats_per_user}.')
    active = event.registrations.filter(status=Registration.ACTIVE).count()
    status = (
        Registration.ACTIVE if active < event.capacity
        else Registration.WAITLIST
    )
    return Registration.objects.create(
        event=event, cat=cat, user=user, status=status
    )


@transaction.atomic
def leave_event(event_id, cat, user):
    event = Event.objects.select_for_update().get(pk=event_id)
    if event.starts_at <= timezone.now():
        reject('event', 'Встреча уже началась, отменить запись нельзя.')
    registration = event.registrations.filter(cat=cat, user=user).first()
    if registration is None:
        reject('cat', 'Этот котик не записан на встречу.')
    registration.delete()
    return promote_waitlist(event)
