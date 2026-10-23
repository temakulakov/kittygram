import base64
import io
from datetime import timedelta

from cats.models import Cat
from django.contrib.auth import get_user_model
from django.utils import timezone
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Event, Registration

User = get_user_model()


class EventApiTests(APITestCase):

    @classmethod
    def setUpTestData(cls):
        cls.organizer = User.objects.create_user('organizer', password='pass')
        cls.alice = User.objects.create_user('alice', password='pass')
        cls.bob = User.objects.create_user('bob', password='pass')
        cls.carol = User.objects.create_user('carol', password='pass')
        cls.barsik = Cat.objects.create(
            name='Барсик', color='black', birth_year=2020, owner=cls.alice)
        cls.murka = Cat.objects.create(
            name='Мурка', color='white', birth_year=2021, owner=cls.alice)
        cls.tom = Cat.objects.create(
            name='Том', color='gray', birth_year=2019, owner=cls.bob)
        cls.vaska = Cat.objects.create(
            name='Васька', color='orange', birth_year=2022, owner=cls.carol)

    def setUp(self):
        self.event = Event.objects.create(
            title='Выставка пушистых', city='Москва', address='Парк Горького',
            starts_at=timezone.now() + timedelta(days=3),
            ends_at=timezone.now() + timedelta(days=3, hours=2),
            capacity=2, organizer=self.organizer,
        )
        self.join_url = f'/api/events/{self.event.id}/join/'
        self.leave_url = f'/api/events/{self.event.id}/leave/'

    def join(self, user, cat):
        self.client.force_authenticate(user)
        return self.client.post(self.join_url, {'cat': cat.id})

    def test_anonymous_can_read_events(self):
        response = self.client.get('/api/events/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    def test_anonymous_cannot_create_event(self):
        response = self.client.post('/api/events/', {'title': 'x'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_event(self):
        self.client.force_authenticate(self.alice)
        start = timezone.now() + timedelta(days=1)
        response = self.client.post('/api/events/', {
            'title': 'Кото-пикник', 'city': 'Москва', 'address': 'ВДНХ',
            'starts_at': start, 'ends_at': start + timedelta(hours=2),
            'capacity': 5,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['organizer'], 'alice')
        self.assertEqual(response.data['free_places'], 5)

    def test_create_event_in_past_is_rejected(self):
        self.client.force_authenticate(self.alice)
        response = self.client.post('/api/events/', {
            'title': 'Вчерашняя', 'city': 'Москва', 'address': 'Арбат',
            'starts_at': timezone.now() - timedelta(days=1),
            'ends_at': timezone.now(), 'capacity': 5,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('starts_at', response.data)

    def test_end_before_start_is_rejected(self):
        self.client.force_authenticate(self.alice)
        start = timezone.now() + timedelta(days=1)
        response = self.client.post('/api/events/', {
            'title': 'Наоборот', 'city': 'Москва', 'address': 'Арбат',
            'starts_at': start, 'ends_at': start - timedelta(hours=1),
            'capacity': 5,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ends_at', response.data)

    def test_join_and_waitlist(self):
        self.assertEqual(self.join(self.alice, self.barsik).data['status'],
                         Registration.ACTIVE)
        self.assertEqual(self.join(self.bob, self.tom).data['status'],
                         Registration.ACTIVE)
        response = self.join(self.carol, self.vaska)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], Registration.WAITLIST)
        self.assertEqual(response.data['position'], 1)

    def test_leave_promotes_first_from_waitlist(self):
        self.join(self.alice, self.barsik)
        self.join(self.bob, self.tom)
        self.join(self.carol, self.vaska)
        self.client.force_authenticate(self.bob)
        response = self.client.post(self.leave_url, {'cat': self.tom.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data['promoted_from_waitlist'][0]['cat'], self.vaska.id)
        self.assertEqual(
            Registration.objects.get(cat=self.vaska).status,
            Registration.ACTIVE)

    def test_cannot_register_foreign_cat(self):
        response = self.join(self.bob, self.barsik)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_register_twice(self):
        self.join(self.alice, self.barsik)
        response = self.join(self.alice, self.barsik)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_max_cats_per_user(self):
        self.join(self.alice, self.barsik)
        response = self.join(self.alice, self.murka)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_only_organizer_can_edit_and_cancel(self):
        self.client.force_authenticate(self.alice)
        url = f'/api/events/{self.event.id}/'
        self.assertEqual(self.client.patch(url, {'capacity': 10}).status_code,
                         status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.post(url + 'cancel/').status_code,
                         status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(self.organizer)
        response = self.client.post(url + 'cancel/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_cancelled'])

    def test_cannot_join_cancelled_event(self):
        self.event.is_cancelled = True
        self.event.save()
        response = self.join(self.alice, self.barsik)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_capacity_cannot_be_less_than_participants(self):
        self.join(self.alice, self.barsik)
        self.join(self.bob, self.tom)
        self.client.force_authenticate(self.organizer)
        response = self.client.patch(
            f'/api/events/{self.event.id}/', {'capacity': 1})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_capacity_increase_promotes_waitlist(self):
        self.join(self.alice, self.barsik)
        self.join(self.bob, self.tom)
        self.join(self.carol, self.vaska)
        self.client.force_authenticate(self.organizer)
        response = self.client.patch(
            f'/api/events/{self.event.id}/', {'capacity': 3})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['participants_count'], 3)
        self.assertEqual(response.data['waitlist_count'], 0)
        self.assertEqual(
            Registration.objects.get(cat=self.vaska).status,
            Registration.ACTIVE)

    def test_filter_has_free_places(self):
        self.join(self.alice, self.barsik)
        self.join(self.bob, self.tom)
        response = self.client.get('/api/events/?has_free_places=true')
        self.assertEqual(response.data['count'], 0)
        response = self.client.get('/api/events/?city=Москва')
        self.assertEqual(response.data['count'], 1)

    def test_my_events(self):
        self.join(self.alice, self.barsik)
        response = self.client.get('/api/events/my/')
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['participants_count'], 1)

    def test_deleting_cat_promotes_waitlist(self):
        self.join(self.alice, self.barsik)
        self.join(self.bob, self.tom)
        self.join(self.carol, self.vaska)
        self.client.force_authenticate(self.alice)
        response = self.client.delete(f'/api/cats/{self.barsik.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(
            Registration.objects.get(cat=self.vaska).status,
            Registration.ACTIVE)

    def test_upcoming_filter(self):
        Event.objects.create(
            title='Прошедшая', city='Москва', address='Арбат',
            starts_at=timezone.now() - timedelta(days=2),
            ends_at=timezone.now() - timedelta(days=2, hours=-2),
            capacity=5, organizer=self.organizer,
        )
        response = self.client.get('/api/events/?upcoming=true')
        self.assertEqual(response.data['count'], 1)
        response = self.client.get('/api/events/?upcoming=false')
        self.assertEqual(response.data['count'], 1)


class CatPermissionTests(APITestCase):

    def test_only_owner_can_edit_cat(self):
        owner = User.objects.create_user('owner', password='pass')
        stranger = User.objects.create_user('stranger', password='pass')
        cat = Cat.objects.create(
            name='Пушок', color='white', birth_year=2020, owner=owner)
        self.client.force_authenticate(stranger)
        response = self.client.patch(f'/api/cats/{cat.id}/', {'name': 'Мой'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_image_is_resized_and_owner_name_returned(self):
        owner = User.objects.create_user('photo_owner', password='pass')
        buffer = io.BytesIO()
        Image.new('RGB', (3000, 2000), 'orange').save(buffer, format='PNG')
        data = 'data:image/png;base64,' + base64.b64encode(
            buffer.getvalue()).decode()
        self.client.force_authenticate(owner)
        response = self.client.post('/api/cats/', {
            'name': 'Фотик', 'color': '#000000', 'birth_year': 2020,
            'image': data}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['owner_name'], 'photo_owner')
        cat = Cat.objects.get(pk=response.data['id'])
        self.assertEqual(max(cat.image.width, cat.image.height), 1600)
        cat.image.delete()

    def test_broken_image_is_rejected(self):
        owner = User.objects.create_user('broken', password='pass')
        self.client.force_authenticate(owner)
        response = self.client.post('/api/cats/', {
            'name': 'Битый', 'color': '#000000', 'birth_year': 2020,
            'image': 'data:image/png;base64,bm90LWFuLWltYWdl'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('image', response.data)
