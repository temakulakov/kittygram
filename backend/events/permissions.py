from rest_framework import permissions


class IsOrganizerOrReadOnly(permissions.BasePermission):
    message = 'Изменять встречу может только её организатор.'

    def has_permission(self, request, view):
        return (
            request.method in permissions.SAFE_METHODS
            or request.user.is_authenticated
        )

    def has_object_permission(self, request, view, obj):
        return (
            request.method in permissions.SAFE_METHODS
            or obj.organizer == request.user
            or request.user.is_staff
        )
