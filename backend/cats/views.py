from django.db import transaction
from events.models import Registration
from events.services import promote_waitlist
from rest_framework import permissions, viewsets

from .models import Achievement, Cat
from .permissions import IsOwnerOrReadOnly
from .serializers import AchievementSerializer, CatSerializer


class CatViewSet(viewsets.ModelViewSet):
    queryset = Cat.objects.select_related('owner').prefetch_related(
        'achievements'
    )
    serializer_class = CatSerializer
    permission_classes = (permissions.IsAuthenticated, IsOwnerOrReadOnly)
    filterset_fields = ('color', 'birth_year', 'owner')
    search_fields = ('name',)
    ordering_fields = ('id', 'name', 'birth_year')
    ordering = ('id',)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @transaction.atomic
    def perform_destroy(self, instance):
        events = [
            registration.event for registration in
            instance.registrations.filter(status=Registration.ACTIVE)
            .select_related('event')
        ]
        instance.delete()
        for event in events:
            promote_waitlist(event)


class AchievementViewSet(viewsets.ModelViewSet):
    queryset = Achievement.objects.all()
    serializer_class = AchievementSerializer
    pagination_class = None
    http_method_names = ('get', 'post', 'head', 'options')
