from decimal import Decimal

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Category, Favorite, MenuItem, Order, OrderItem, Topping


class ToppingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topping
        fields = ['id', 'name', 'price', 'available']


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'icon', 'image_url', 'sort_order']


class MenuItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    is_favorite = serializers.SerializerMethodField()
    toppings = ToppingSerializer(many=True, read_only=True)

    class Meta:
        model = MenuItem
        fields = [
            'id',
            'name',
            'subtitle',
            'description',
            'price',
            'original_price',
            'image_url',
            'delivery_mins',
            'free_delivery',
            'rating',
            'review_count',
            'is_popular',
            'is_featured',
            'promo_label',
            'category',
            'category_name',
            'category_slug',
            'is_favorite',
            'toppings',
        ]

    def get_is_favorite(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return Favorite.objects.filter(user=request.user, item=obj).exists()


class OrderItemWriteSerializer(serializers.Serializer):
    menu_item_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, max_value=99)
    topping_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
        default=list,
    )


class OrderItemSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='menu_item.name', read_only=True)
    image_url = serializers.CharField(source='menu_item.image_url', read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            'id',
            'menu_item',
            'name',
            'image_url',
            'quantity',
            'unit_price',
            'line_total',
            'toppings_text',
        ]

    def get_line_total(self, obj):
        return obj.quantity * obj.unit_price


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    cart_items = OrderItemWriteSerializer(many=True, write_only=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'guest_name',
            'guest_phone',
            'address',
            'status',
            'total',
            'notes',
            'payment_status',
            'razorpay_order_id',
            'payment_id',
            'created_at',
            'items',
            'cart_items',
        ]
        read_only_fields = [
            'status',
            'total',
            'payment_status',
            'razorpay_order_id',
            'payment_id',
            'created_at',
        ]

    def create(self, validated_data):
        cart_items = validated_data.pop('cart_items')
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else None

        order = Order.objects.create(user=user, **validated_data)
        total = Decimal('0')

        for entry in cart_items:
            item = MenuItem.objects.prefetch_related('toppings').get(pk=entry['menu_item_id'])
            qty = entry['quantity']
            topping_ids = entry.get('topping_ids') or []
            selected = list(item.toppings.filter(id__in=topping_ids, available=True))
            topping_total = sum((t.price for t in selected), Decimal('0'))
            unit = item.price + topping_total
            toppings_text = ', '.join(t.name for t in selected)

            OrderItem.objects.create(
                order=order,
                menu_item=item,
                quantity=qty,
                unit_price=unit,
                toppings_text=toppings_text,
            )
            total += unit * qty

        order.total = total
        order.save(update_fields=['total'])
        return order


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'password']

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            first_name=validated_data.get('first_name', ''),
            password=validated_data['password'],
        )


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

    def validate(self, attrs):
        user = authenticate(username=attrs['username'], password=attrs['password'])
        if not user:
            raise serializers.ValidationError('Invalid username or password.')
        attrs['user'] = user
        return attrs


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name']
