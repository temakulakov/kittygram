from cats.models import Cat
from django.utils import timezone
from rest_framework import serializers

from .models import Event, Registration


class EventSerializer(serializers.ModelSerializer):
    organizer = serializers.SlugRelatedField(
        slug_field='username', read_only=True
    )
    participants_count = serializers.SerializerMethodField()
    waitlist_count = serializers.SerializerMethodField()
    free_places = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = (
            'id', 'title', 'description', 'city', 'address',
            'starts_at', 'ends_at', 'capacity', 'max_cats_per_user',
            'organizer', 'is_cancelled', 'participants_count',
            'waitlist_count', 'free_places', 'created_at',
        )
        read_only_fields = ('is_cancelled', 'created_at')

    @staticmethod
    def count_registrations(obj, attr, status):
        value = getattr(obj, attr, None)
        if value is None:
            value = obj.registrations.filter(status=status).count()
        return value

    def get_participants_count(self, obj) -> int:
        return self.count_registrations(
            obj, 'participants_count', Registration.ACTIVE
        )

    def get_waitlist_count(self, obj) -> int:
        return self.count_registrations(
            obj, 'waitlist_count', Registration.WAITLIST
        )

    def get_free_places(self, obj) -> int:
        return max(obj.capacity - self.get_participants_count(obj), 0)

    def validate_starts_at(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError(
                'Встречу можно назначить только на будущее время.'
            )
        return value

    def validate(self, attrs):
        starts_at = attrs.get(
            'starts_at', getattr(self.instance, 'starts_at', None)
        )
        ends_at = attrs.get('ends_at', getattr(self.instance, 'ends_at', None))
        if starts_at and ends_at and ends_at <= starts_at:
            raise serializers.ValidationError(
                {'ends_at': 'Окончание встречи должно быть позже начала.'}
            )
        if self.instance and 'capacity' in attrs:
            active = self.instance.registrations.filter(
                status=Registration.ACTIVE
            ).count()
            if attrs['capacity'] < active:
                raise serializers.ValidationError({
                    'capacity': 'Нельзя сделать мест меньше, чем уже '
                                f'записано участников ({active}).'
                })
        return attrs


class RegistrationActionSerializer(serializers.Serializer):
    cat = serializers.PrimaryKeyRelatedField(queryset=Cat.objects.all())


class RegistrationSerializer(serializers.ModelSerializer):
    cat_name = serializers.CharField(source='cat.name', read_only=True)
    owner = serializers.CharField(source='user.username', read_only=True)
    event_title = serializers.CharField(source='event.title', read_only=True)
    position = serializers.SerializerMethodField()

    class Meta:
        model = Registration
        fields = (
            'id', 'event', 'event_title', 'cat', 'cat_name', 'owner',
            'status', 'position', 'created_at',
        )

    def get_position(self, obj) -> int | None:
        if obj.status != Registration.WAITLIST:
            return None
        return obj.event.registrations.filter(
            status=Registration.WAITLIST, created_at__lte=obj.created_at
        ).count()
