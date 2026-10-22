from django.db.models import F
from django_filters import rest_framework as filters

from .models import Event, Registration


class EventFilter(filters.FilterSet):
    city = filters.CharFilter(lookup_expr='iexact')
    date_from = filters.DateFilter(field_name='starts_at', lookup_expr='date__gte')
    date_to = filters.DateFilter(field_name='starts_at', lookup_expr='date__lte')
    organizer = filters.CharFilter(field_name='organizer__username')
    has_free_places = filters.BooleanFilter(method='filter_has_free_places')

    class Meta:
        model = Event
        fields = ('city', 'is_cancelled', 'organizer')

    def filter_has_free_places(self, queryset, name, value):
        if value:
            return queryset.filter(participants_count__lt=F('capacity'))
        return queryset.filter(participants_count__gte=F('capacity'))


class RegistrationFilter(filters.FilterSet):
    status = filters.ChoiceFilter(choices=Registration.STATUS_CHOICES)

    class Meta:
        model = Registration
        fields = ('status', 'event', 'cat')
