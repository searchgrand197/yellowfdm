from decimal import Decimal

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import serializers

from .models import (
    Category,
    Combo,
    Coupon,
    Favorite,
    MenuItem,
    Order,
    OrderItem,
    ShopSettings,
    Topping,
)


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
    topping_ids = serializers.PrimaryKeyRelatedField(
        source='toppings',
        many=True,
        queryset=Topping.objects.all(),
        required=False,
        write_only=True,
    )

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
            'available',
            'promo_label',
            'sort_order',
            'category',
            'category_name',
            'category_slug',
            'is_favorite',
            'toppings',
            'topping_ids',
        ]

    def get_is_favorite(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return Favorite.objects.filter(user=request.user, item=obj).exists()


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = [
            'id',
            'code',
            'amount',
            'min_order_value',
            'one_time',
            'active',
            'expires_at',
            'max_uses',
            'used_count',
            'created_at',
        ]
        read_only_fields = ['used_count', 'created_at']


class ComboSerializer(serializers.ModelSerializer):
    item_a_name = serializers.CharField(source='item_a.name', read_only=True)
    item_b_name = serializers.CharField(source='item_b.name', read_only=True)
    item_c_name = serializers.SerializerMethodField()
    item_d_name = serializers.SerializerMethodField()
    item_a_image = serializers.CharField(source='item_a.image_url', read_only=True)
    item_b_image = serializers.CharField(source='item_b.image_url', read_only=True)
    item_c_image = serializers.SerializerMethodField()
    item_d_image = serializers.SerializerMethodField()
    actual_price = serializers.SerializerMethodField()
    item_ids = serializers.SerializerMethodField()
    item_names = serializers.SerializerMethodField()

    class Meta:
        model = Combo
        fields = [
            'id',
            'name',
            'badge',
            'item_a',
            'item_b',
            'item_c',
            'item_d',
            'item_a_name',
            'item_b_name',
            'item_c_name',
            'item_d_name',
            'item_a_image',
            'item_b_image',
            'item_c_image',
            'item_d_image',
            'item_ids',
            'item_names',
            'actual_price',
            'price',
            'save_amount',
            'sort_order',
            'active',
            'image_url',
        ]
        extra_kwargs = {
            'item_c': {'required': False, 'allow_null': True},
            'item_d': {'required': False, 'allow_null': True},
            'save_amount': {'required': False},
            'image_url': {'required': False, 'allow_blank': True},
        }

    def get_item_c_name(self, obj):
        return obj.item_c.name if obj.item_c_id else None

    def get_item_d_name(self, obj):
        return obj.item_d.name if obj.item_d_id else None

    def get_item_c_image(self, obj):
        return obj.item_c.image_url if obj.item_c_id else None

    def get_item_d_image(self, obj):
        return obj.item_d.image_url if obj.item_d_id else None

    def get_actual_price(self, obj):
        return str(obj.actual_price())

    def get_item_ids(self, obj):
        return [i.id for i in obj.menu_items()]

    def get_item_names(self, obj):
        return [i.name for i in obj.menu_items()]

    def _resolved_items(self, validated):
        keys = ('item_a', 'item_b', 'item_c', 'item_d')
        if self.instance:
            current = {
                'item_a': self.instance.item_a,
                'item_b': self.instance.item_b,
                'item_c': self.instance.item_c,
                'item_d': self.instance.item_d,
            }
        else:
            current = {k: None for k in keys}
        for key in keys:
            if key in validated:
                current[key] = validated[key]
        return [i for i in (current['item_a'], current['item_b'], current['item_c'], current['item_d']) if i]

    def _auto_save(self, validated):
        items = self._resolved_items(validated)
        actual = sum((i.price for i in items), Decimal('0'))
        price = validated.get(
            'price',
            self.instance.price if self.instance else Decimal('0'),
        )
        validated['save_amount'] = max(Decimal('0'), actual - Decimal(str(price)))
        return validated

    def validate_image_url(self, value):
        return (value or '').strip()

    def create(self, validated_data):
        return super().create(self._auto_save(validated_data))

    def update(self, instance, validated_data):
        return super().update(instance, self._auto_save(validated_data))


class ShopSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShopSettings
        fields = [
            'is_open',
            'reopens_at',
            'opens_at',
            'closes_at',
            'closed_message',
            'updated_at',
        ]
        read_only_fields = ['updated_at']


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
            'coupon_code',
            'discount',
            'payment_status',
            'razorpay_order_id',
            'payment_id',
            'wallet_used',
            'created_at',
            'items',
            'cart_items',
        ]
        read_only_fields = [
            'status',
            'total',
            'discount',
            'payment_status',
            'razorpay_order_id',
            'payment_id',
            'wallet_used',
            'created_at',
        ]

    def create(self, validated_data):
        cart_items = validated_data.pop('cart_items')
        coupon_code = (validated_data.get('coupon_code') or '').strip().upper()
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else None

        order = Order.objects.create(user=user, **validated_data)
        total = Decimal('0')

        for entry in cart_items:
            item = MenuItem.objects.prefetch_related('toppings').get(pk=entry['menu_item_id'])
            if not item.available:
                raise serializers.ValidationError(f'{item.name} is out of stock')
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

        discount = Decimal('0')
        if coupon_code:
            coupon = Coupon.objects.filter(code__iexact=coupon_code, active=True).first()
            if coupon:
                expired = coupon.expires_at and coupon.expires_at < timezone.now()
                overused = coupon.max_uses is not None and coupon.used_count >= coupon.max_uses
                below_min = total < (coupon.min_order_value or Decimal('0'))
                phone = (validated_data.get('guest_phone') or order.guest_phone or '').strip()
                already_used = False
                if coupon.one_time and phone:
                    already_used = Order.objects.filter(
                        coupon_code__iexact=coupon.code,
                        guest_phone=phone,
                    ).exclude(pk=order.pk).exclude(status='cancelled').exists()
                if already_used:
                    raise serializers.ValidationError(
                        'This one-time coupon was already used on this number'
                    )
                if not expired and not overused and not below_min:
                    discount = min(coupon.amount, total)
                    coupon.used_count += 1
                    coupon.save(update_fields=['used_count'])
                    order.coupon_code = coupon.code
                elif below_min:
                    raise serializers.ValidationError(
                        f'Coupon requires a minimum order of ₹{coupon.min_order_value}'
                    )

        order.discount = discount
        order.total = max(Decimal('0'), total - discount)
        # Fully covered by coupon → treat as paid so it hits the kitchen board.
        if order.total <= 0:
            order.payment_status = 'completed'
            order.status = 'confirmed'
            order.payment_id = 'free'
            order.save(
                update_fields=[
                    'total',
                    'discount',
                    'coupon_code',
                    'payment_status',
                    'status',
                    'payment_id',
                ]
            )
        else:
            order.save(update_fields=['total', 'discount', 'coupon_code'])
        return order


class AdminOrderStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['status']


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
    is_staff = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'is_staff']
