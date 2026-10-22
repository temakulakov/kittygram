from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .filters import EventFilter, RegistrationFilter
from .models import Event, Registration
from .permissions import IsOrganizerOrReadOnly
from .serializers import (EventSerializer, RegistrationActionSerializer,
                          RegistrationSerializer)
from .services import join_event, leave_event, promote_waitlist


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.select_related('organizer').annotate(
        participants_count=Count(
            'registrations',
            filter=Q(registrations__status=Registration.ACTIVE),
        ),
        waitlist_count=Count(
            'registrations',
            filter=Q(registrations__status=Registration.WAITLIST),
        ),
    )
    serializer_class = EventSerializer
    permission_classes = (IsOrganizerOrReadOnly,)
    filterset_class = EventFilter
    search_fields = ('title', 'description', 'address')
    ordering_fields = ('starts_at', 'capacity', 'created_at')
    ordering = ('starts_at',)

    def get_throttles(self):
        if self.action in ('join', 'leave'):
            self.throttle_scope = 'event_registration'
        return super().get_throttles()

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)

    def perform_update(self, serializer):
        event = serializer.save()
        promote_waitlist(event)
        serializer.instance = self.get_queryset().get(pk=event.pk)

    def get_registrations_page(self, queryset):
        page = self.paginate_queryset(queryset)
        serializer = RegistrationSerializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @extend_schema(request=RegistrationActionSerializer,
                   responses={201: RegistrationSerializer})
    @action(detail=True, methods=('post',),
            permission_classes=(permissions.IsAuthenticated,))
    def join(self, request, pk=None):
        event = self.get_object()
        serializer = RegistrationActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        registration = join_event(
            event.pk, serializer.validated_data['cat'], request.user
        )
        return Response(RegistrationSerializer(registration).data,
                        status=status.HTTP_201_CREATED)

    @extend_schema(request=RegistrationActionSerializer,
                   responses={200: RegistrationSerializer(many=True)})
    @action(detail=True, methods=('post',),
            permission_classes=(permissions.IsAuthenticated,))
    def leave(self, request, pk=None):
        event = self.get_object()
        serializer = RegistrationActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        promoted = leave_event(
            event.pk, serializer.validated_data['cat'], request.user
        )
        return Response({
            'detail': 'Запись отменена.',
            'promoted_from_waitlist': RegistrationSerializer(
                promoted, many=True
            ).data,
        })

    @extend_schema(request=None, responses={200: EventSerializer})
    @action(detail=True, methods=('post',))
    def cancel(self, request, pk=None):
        event = self.get_object()
        if event.is_cancelled:
            raise ValidationError({'event': ['Встреча уже отменена.']})
        event.is_cancelled = True
        event.save(update_fields=('is_cancelled',))
        return Response(self.get_serializer(self.get_object()).data)

    @extend_schema(responses={200: RegistrationSerializer(many=True)})
    @action(detail=True, methods=('get',))
    def participants(self, request, pk=None):
        event = self.get_object()
        return self.get_registrations_page(
            event.registrations.filter(status=Registration.ACTIVE)
            .select_related('cat', 'user', 'event')
        )

    @extend_schema(responses={200: RegistrationSerializer(many=True)})
    @action(detail=True, methods=('get',))
    def waitlist(self, request, pk=None):
        event = self.get_object()
        return self.get_registrations_page(
            event.registrations.filter(status=Registration.WAITLIST)
            .select_related('cat', 'user', 'event')
        )

    @action(detail=False, methods=('get',),
            permission_classes=(permissions.IsAuthenticated,))
    def my(self, request):
        my_events = Registration.objects.filter(
            user=request.user
        ).values('event_id')
        queryset = self.filter_queryset(self.get_queryset()).filter(
            id__in=my_events
        )
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)


class RegistrationViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin,
                          viewsets.GenericViewSet):
    serializer_class = RegistrationSerializer
    filterset_class = RegistrationFilter
    ordering_fields = ('created_at',)

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Registration.objects.none()
        return Registration.objects.filter(
            user=self.request.user
        ).select_related('cat', 'user', 'event')
