from cats.models import Cat
from django.contrib.auth import get_user_model
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

User = get_user_model()


class Event(models.Model):
    title = models.CharField('Название', max_length=128)
    description = models.TextField('Описание', blank=True)
    city = models.CharField('Город', max_length=64)
    address = models.CharField('Адрес', max_length=256)
    starts_at = models.DateTimeField('Начало')
    ends_at = models.DateTimeField('Окончание')
    capacity = models.PositiveSmallIntegerField(
        'Мест для котиков',
        validators=(MinValueValidator(1), MaxValueValidator(500)),
    )
    max_cats_per_user = models.PositiveSmallIntegerField(
        'Котиков от одного хозяина',
        default=1,
        validators=(MinValueValidator(1), MaxValueValidator(10)),
    )
    organizer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='organized_events',
        verbose_name='Организатор',
    )
    is_cancelled = models.BooleanField('Отменена', default=False)
    created_at = models.DateTimeField('Создана', auto_now_add=True)

    class Meta:
        verbose_name = 'кото-встречу'
        verbose_name_plural = 'Кото-встречи'
        ordering = ('starts_at',)
        constraints = (
            models.CheckConstraint(
                condition=models.Q(ends_at__gt=models.F('starts_at')),
                name='event_ends_after_start',
            ),
        )

    def __str__(self):
        return self.title


class Registration(models.Model):
    ACTIVE = 'active'
    WAITLIST = 'waitlist'
    STATUS_CHOICES = (
        (ACTIVE, 'Участник'),
        (WAITLIST, 'Лист ожидания'),
    )

    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='registrations',
        verbose_name='Встреча',
    )
    cat = models.ForeignKey(
        Cat,
        on_delete=models.CASCADE,
        related_name='registrations',
        verbose_name='Котик',
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='event_registrations',
        verbose_name='Хозяин',
    )
    status = models.CharField(
        'Статус', max_length=16, choices=STATUS_CHOICES, default=ACTIVE
    )
    created_at = models.DateTimeField('Записан', auto_now_add=True)

    class Meta:
        verbose_name = 'запись на встречу'
        verbose_name_plural = 'Записи на встречи'
        ordering = ('created_at', 'id')
        constraints = (
            models.UniqueConstraint(
                fields=('event', 'cat'), name='unique_cat_per_event'
            ),
        )

    def __str__(self):
        return f'{self.cat} → {self.event} ({self.get_status_display()})'
