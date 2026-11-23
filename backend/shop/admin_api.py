import uuid
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.core.files.storage import default_storage
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .models import Category, Combo, Coupon, MenuItem, Order, ShopSettings, Topping
from .serializers import (
    AdminOrderStatusSerializer,
    CategorySerializer,
    ComboSerializer,
    CouponSerializer,
    MenuItemSerializer,
    OrderSerializer,
    ShopSettingsSerializer,
    ToppingSerializer,
)

ALLOWED_IMAGE_EXT = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}


class IsStaffUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


def _apply_reorder(model, ids):
    if not isinstance(ids, list) or not ids:
        return False
    for index, pk in enumerate(ids):
        model.objects.filter(pk=pk).update(sort_order=index)
    return True


class AdminCategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsStaffUser]
    lookup_field = 'pk'


class AdminToppingViewSet(viewsets.ModelViewSet):
    queryset = Topping.objects.all()
    serializer_class = ToppingSerializer
    permission_classes = [IsStaffUser]


class AdminMenuItemViewSet(viewsets.ModelViewSet):
    serializer_class = MenuItemSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        return MenuItem.objects.select_related('category').prefetch_related('toppings')


class AdminCouponViewSet(viewsets.ModelViewSet):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    permission_classes = [IsStaffUser]


class AdminComboViewSet(viewsets.ModelViewSet):
    serializer_class = ComboSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        return Combo.objects.select_related('item_a', 'item_b', 'item_c', 'item_d')


@api_view(['POST'])
@permission_classes([IsStaffUser])
def admin_reorder_categories(request):
    if not _apply_reorder(Category, request.data.get('ids')):
        return Response({'error': 'ids required'}, status=status.HTTP_400_BAD_REQUEST)
    return Response({'ok': True})


@api_view(['POST'])
@permission_classes([IsStaffUser])
def admin_reorder_items(request):
    if not _apply_reorder(MenuItem, request.data.get('ids')):
        return Response({'error': 'ids required'}, status=status.HTTP_400_BAD_REQUEST)
    return Response({'ok': True})


@api_view(['POST'])
@permission_classes([IsStaffUser])
def admin_reorder_combos(request):
    if not _apply_reorder(Combo, request.data.get('ids')):
        return Response({'error': 'ids required'}, status=status.HTTP_400_BAD_REQUEST)
    return Response({'ok': True})


class AdminOrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsStaffUser]
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_queryset(self):
        # Only paid orders belong on the kitchen dashboard.
        qs = Order.objects.prefetch_related('items__menu_item').filter(
            payment_status='completed'
        )
        status_filter = self.request.query_params.get('status')
        phone = self.request.query_params.get('phone')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if phone:
            qs = qs.filter(guest_phone__icontains=phone)
        return qs

    def get_serializer_class(self):
        if self.action in ('partial_update', 'update'):
            return AdminOrderStatusSerializer
        return OrderSerializer


@api_view(['GET'])
@permission_classes([IsStaffUser])
def admin_orders_new(request):
    """Recent paid orders for buzz. Client dedupes by id (payment happens after create)."""
    qs = Order.objects.filter(
        payment_status='completed',
        created_at__gte=timezone.now() - timedelta(minutes=45),
    ).order_by('created_at')
    since = request.query_params.get('since')
    if since:
        parsed = parse_datetime(since)
        if parsed:
            if timezone.is_naive(parsed):
                parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
            # Keep a short lookback so orders paid after create still appear once.
            qs = qs.filter(created_at__gte=parsed - timedelta(minutes=20))
    data = [
        {
            'id': o.id,
            'guest_name': o.guest_name,
            'guest_phone': o.guest_phone,
            'total': str(o.total),
            'created_at': o.created_at.isoformat(),
            'status': o.status,
            'payment_status': o.payment_status,
        }
        for o in qs[:50]
    ]
    return Response({'count': len(data), 'orders': data})


@api_view(['POST'])
@permission_classes([IsStaffUser])
@parser_classes([MultiPartParser, FormParser])
def admin_upload(request):
    uploaded = request.FILES.get('file')
    if not uploaded:
        return Response({'error': 'file is required'}, status=status.HTTP_400_BAD_REQUEST)

    ext = Path(uploaded.name).suffix.lower()
    if ext not in ALLOWED_IMAGE_EXT:
        return Response(
            {'error': 'Use a JPG, PNG, WEBP, or GIF image'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if uploaded.size > 5 * 1024 * 1024:
        return Response({'error': 'Image must be under 5MB'}, status=status.HTTP_400_BAD_REQUEST)

    filename = f'uploads/{uuid.uuid4().hex}{ext}'
    saved = default_storage.save(filename, uploaded)
    url = f"{settings.MEDIA_URL.rstrip('/')}/{saved.lstrip('/')}"
    return Response({'url': url})


@api_view(['GET', 'PATCH'])
@permission_classes([IsStaffUser])
def admin_shop_settings(request):
    from .shop_hours import effective_shop_payload

    shop = ShopSettings.get_solo()
    if request.method == 'GET':
        data = ShopSettingsSerializer(shop).data
        data['manual_open'] = shop.is_open
        data['is_open'] = effective_shop_payload(shop)['is_open']
        return Response(data)

    payload = dict(request.data)
    for key in ('opens_at', 'closes_at', 'reopens_at'):
        if payload.get(key) == '':
            payload[key] = None

    serializer = ShopSettingsSerializer(shop, data=payload, partial=True)
    serializer.is_valid(raise_exception=True)
    is_open = serializer.validated_data.get('is_open', shop.is_open)
    reopens_at = serializer.validated_data.get('reopens_at', shop.reopens_at)

    # Default reopen +50 minutes when closing without a time.
    if is_open is False and not reopens_at and shop.is_open:
        reopens_at = timezone.now() + timedelta(minutes=50)
        serializer.validated_data['reopens_at'] = reopens_at
    if is_open is True:
        serializer.validated_data['reopens_at'] = None

    serializer.save()
    shop.refresh_from_db()
    data = ShopSettingsSerializer(shop).data
    data['manual_open'] = shop.is_open
    data['is_open'] = effective_shop_payload(shop)['is_open']
    return Response(data)
