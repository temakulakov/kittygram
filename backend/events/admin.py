from django.contrib import admin

from .models import Event, Registration


class RegistrationInline(admin.TabularInline):
    model = Registration
    extra = 0


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'city', 'starts_at', 'capacity',
                    'organizer', 'is_cancelled')
    list_filter = ('city', 'is_cancelled')
    search_fields = ('title', 'address')
    inlines = (RegistrationInline,)


@admin.register(Registration)
class RegistrationAdmin(admin.ModelAdmin):
    list_display = ('id', 'event', 'cat', 'user', 'status', 'created_at')
    list_filter = ('status',)
