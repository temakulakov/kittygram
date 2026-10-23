import base64
import binascii
import datetime as dt
import io
import uuid

import webcolors
from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Achievement, AchievementCat, Cat


@extend_schema_field(str)
class Hex2NameColor(serializers.Field):
    def to_representation(self, value):
        return value

    def to_internal_value(self, data):
        try:
            data = webcolors.hex_to_name(data)
        except ValueError:
            raise serializers.ValidationError('Для этого цвета нет имени')
        return data


class AchievementSerializer(serializers.ModelSerializer):
    achievement_name = serializers.CharField(source='name')

    class Meta:
        model = Achievement
        fields = ('id', 'achievement_name')


class Base64ImageField(serializers.ImageField):
    max_side = 1600

    def to_internal_value(self, data):
        if isinstance(data, str) and data.startswith('data:image'):
            try:
                imgstr = data.split(';base64,')[1]
                image = Image.open(io.BytesIO(base64.b64decode(imgstr)))
                image = ImageOps.exif_transpose(image).convert('RGB')
            except (IndexError, binascii.Error, UnidentifiedImageError):
                raise serializers.ValidationError(
                    'Не удалось прочитать изображение.'
                )
            image.thumbnail((self.max_side, self.max_side))
            buffer = io.BytesIO()
            image.save(buffer, format='JPEG', quality=85)
            data = ContentFile(buffer.getvalue(), name=f'{uuid.uuid4().hex}.jpg')

        return super().to_internal_value(data)


class CatSerializer(serializers.ModelSerializer):
    achievements = AchievementSerializer(required=False, many=True)
    color = Hex2NameColor()
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    age = serializers.SerializerMethodField()
    image = Base64ImageField(required=False, allow_null=True)
    image_url = serializers.SerializerMethodField(
        'get_image_url',
        read_only=True,
    )

    class Meta:
        model = Cat
        fields = (
            'id', 'name', 'color', 'birth_year', 'achievements',
            'owner', 'owner_name', 'age', 'image', 'image_url'
        )
        read_only_fields = ('owner',)

    def validate_birth_year(self, value):
        current_year = dt.date.today().year
        if not 1990 <= value <= current_year:
            raise serializers.ValidationError(
                f'Год рождения должен быть в диапазоне 1990–{current_year}.'
            )
        return value

    def get_image_url(self, obj) -> str | None:
        if obj.image:
            return obj.image.url
        return None

    def get_age(self, obj) -> int:
        return dt.datetime.now().year - obj.birth_year

    def create(self, validated_data):
        if 'achievements' not in self.initial_data:
            cat = Cat.objects.create(**validated_data)
            return cat
        achievements = validated_data.pop('achievements')
        cat = Cat.objects.create(**validated_data)
        for achievement in achievements:
            current_achievement, status = Achievement.objects.get_or_create(
                **achievement
            )
            AchievementCat.objects.create(
                achievement=current_achievement, cat=cat
            )
        return cat

    def update(self, instance, validated_data):
        instance.name = validated_data.get('name', instance.name)
        instance.color = validated_data.get('color', instance.color)
        instance.birth_year = validated_data.get(
            'birth_year', instance.birth_year
        )
        instance.image = validated_data.get('image', instance.image)

        if 'achievements' not in validated_data:
            instance.save()
            return instance

        achievements_data = validated_data.pop('achievements')
        lst = []
        for achievement in achievements_data:
            current_achievement, status = Achievement.objects.get_or_create(
                **achievement
            )
            lst.append(current_achievement)
        instance.achievements.set(lst)

        instance.save()
        return instance
