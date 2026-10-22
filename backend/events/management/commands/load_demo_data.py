from datetime import timedelta

from cats.models import Achievement, AchievementCat, Cat
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from events.models import Event
from events.services import join_event

User = get_user_model()

USERS = ('anna', 'boris', 'vera', 'gleb')
CATS = (
    ('anna', 'Барсик', 'black', 2019, ('Поймал муху', 'Спит 20 часов')),
    ('anna', 'Мурка', 'white', 2021, ('Открыла холодильник',)),
    ('boris', 'Том', 'gray', 2018, ('Поймал муху',)),
    ('vera', 'Рыжик', 'orange', 2022, ('Победитель выставки',)),
    ('gleb', 'Снежок', 'white', 2020, ()),
)
EVENTS = (
    ('Кото-пикник в Сокольниках', 'Москва', 'Парк Сокольники, у фонтана',
     5, 2, 2),
    ('Мастер-класс по груминг-уходу', 'Москва', 'ул. Плеханова, 4',
     12, 3, 1),
    ('Фотосессия «Котики и осень»', 'Подольск', 'Парк Талалихина',
     20, 1, 1),
)


class Command(BaseCommand):
    help = 'Заполняет базу демонстрационными пользователями, котиками и встречами'

    @transaction.atomic
    def handle(self, *args, **options):
        users = {}
        for username in USERS:
            user, created = User.objects.get_or_create(username=username)
            if created:
                user.set_password('KittyPass2026')
                user.save()
            users[username] = user

        cats = {}
        for owner, name, color, year, achievements in CATS:
            cat, _ = Cat.objects.get_or_create(
                name=name, owner=users[owner],
                defaults={'color': color, 'birth_year': year},
            )
            for title in achievements:
                achievement, _ = Achievement.objects.get_or_create(name=title)
                AchievementCat.objects.get_or_create(
                    achievement=achievement, cat=cat)
            cats[name] = cat

        now = timezone.now().replace(minute=0, second=0, microsecond=0)
        for title, city, address, days, capacity, per_user in EVENTS:
            starts_at = now + timedelta(days=days, hours=12 - now.hour)
            event, created = Event.objects.get_or_create(
                title=title,
                defaults={
                    'city': city, 'address': address,
                    'description': f'{title}. Приходите со своими котиками!',
                    'starts_at': starts_at,
                    'ends_at': starts_at + timedelta(hours=3),
                    'capacity': capacity, 'max_cats_per_user': per_user,
                    'organizer': users['gleb'],
                },
            )
            if created and capacity == 2:
                join_event(event.pk, cats['Барсик'], users['anna'])
                join_event(event.pk, cats['Том'], users['boris'])
                join_event(event.pk, cats['Рыжик'], users['vera'])

        self.stdout.write(self.style.SUCCESS(
            f'Готово: пользователей {User.objects.count()}, '
            f'котиков {Cat.objects.count()}, встреч {Event.objects.count()}. '
            'Пароль демо-пользователей: KittyPass2026'
        ))
