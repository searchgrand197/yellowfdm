from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from decimal import Decimal

from .models import Category, Favorite, MenuItem, Order, ScratchClaim, Wallet
from .payments import create_razorpay_order, verify_razorpay_signature
from .serializers import (
    CategorySerializer,
    LoginSerializer,
    MenuItemSerializer,
    OrderSerializer,
    RegisterSerializer,
    UserSerializer,
)

FIREBASE_USER_PASSWORD = '12121212'


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    lookup_field = 'slug'


class MenuItemViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MenuItemSerializer

    def get_queryset(self):
        qs = MenuItem.objects.select_related('category').prefetch_related('toppings')
        category = self.request.query_params.get('category')
        search = self.request.query_params.get('search')
        popular = self.request.query_params.get('popular')
        featured = self.request.query_params.get('featured')

        if category:
            qs = qs.filter(category__slug=category)
        if search:
            qs = qs.filter(name__icontains=search)
        if popular == '1':
            qs = qs.filter(is_popular=True)
        if featured == '1':
            qs = qs.filter(is_featured=True)
        return qs


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return Order.objects.filter(user=user).prefetch_related('items__menu_item')
        return Order.objects.none()

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def public_config(request):
    return Response(
        {
            'razorpay_key': settings.RAZORPAY_API_KEY,
            'firebase': settings.FIREBASE_WEB_CONFIG,
        }
    )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def firebase_login(request):
    """Mirror foodporiumv1.0 firebase_login_save — phone number becomes username."""
    phone = str(request.data.get('username') or request.data.get('phone') or '').strip()
    provider = request.data.get('provider', 'phone')
    name = str(request.data.get('name') or '').strip()

    if not phone:
        return Response({'detail': 'Phone number is required.'}, status=status.HTTP_400_BAD_REQUEST)

    # Keep same username format as v1 (usually 10-digit local number)
    username = phone.replace('+91', '').replace(' ', '')[-10:] if len(phone) > 10 else phone

    user = authenticate(request, username=username, password=FIREBASE_USER_PASSWORD)
    if user is None:
        if User.objects.filter(username=username).exists():
            user = User.objects.get(username=username)
            user.set_password(FIREBASE_USER_PASSWORD)
            if name:
                user.first_name = name
            user.save()
        else:
            user = User.objects.create_user(
                username=username,
                password=FIREBASE_USER_PASSWORD,
                first_name=name or username,
            )

    login(request, user)
    return Response(
        {
            **UserSerializer(user).data,
            'provider': provider,
            'phone': username,
        }
    )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    login(request, user)
    return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.validated_data['user']
    login(request, user)
    return Response(UserSerializer(user).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    logout(request)
    return Response({'ok': True})


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
@ensure_csrf_cookie
def me(request):
    get_token(request)
    if request.user.is_authenticated:
        return Response(UserSerializer(request.user).data)
    return Response({'user': None})


@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def favorites(request, item_id=None):
    if request.method == 'GET':
        ids = Favorite.objects.filter(user=request.user).values_list('item_id', flat=True)
        items = MenuItem.objects.filter(id__in=ids).select_related('category')
        return Response(MenuItemSerializer(items, many=True, context={'request': request}).data)

    if item_id is None:
        return Response({'detail': 'item_id required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        item = MenuItem.objects.get(pk=item_id)
    except MenuItem.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'POST':
        Favorite.objects.get_or_create(user=request.user, item=item)
        return Response({'favorited': True})

    Favorite.objects.filter(user=request.user, item=item).delete()
    return Response({'favorited': False})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def initiate_payment(request):
    amount = request.data.get('amount')
    order_id = str(request.data.get('order_id') or '')

    try:
        amount = int(amount)
        if amount <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        response = create_razorpay_order(amount, order_id)
    except Exception as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    if order_id:
        Order.objects.filter(pk=order_id).update(razorpay_order_id=response['id'])

    return Response(
        {
            'id': response['id'],
            'order_id': response['id'],
            'amount': str(amount * 100),
            'currency': 'INR',
            'key': settings.RAZORPAY_API_KEY,
        }
    )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def verify_payment(request):
    razorpay_order_id = request.data.get('razorpay_order_id')
    razorpay_payment_id = request.data.get('razorpay_payment_id')
    razorpay_signature = request.data.get('razorpay_signature')
    order_id = request.data.get('order_id')

    if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
        return Response(
            {'status': 'error', 'message': 'Missing payment parameters'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    params = {
        'razorpay_order_id': razorpay_order_id,
        'razorpay_payment_id': razorpay_payment_id,
        'razorpay_signature': razorpay_signature,
    }

    try:
        verify_razorpay_signature(params)
    except Exception as exc:
        return Response({'status': 'error', 'message': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    if order_id:
        Order.objects.filter(pk=order_id).update(
            payment_status='completed',
            payment_id=razorpay_payment_id,
            razorpay_order_id=razorpay_order_id,
            status='confirmed',
        )

    return Response(
        {
            'status': 'success',
            'message': 'Payment verified successfully',
            'payment_id': razorpay_payment_id,
        }
    )


def _normalize_phone(phone: str) -> str:
    digits = ''.join(ch for ch in str(phone) if ch.isdigit())
    return digits[-10:] if len(digits) >= 10 else digits


@api_view(['GET', 'POST'])
@permission_classes([permissions.AllowAny])
def wallet_view(request):
    phone = _normalize_phone(request.query_params.get('phone') or request.data.get('phone') or '')
    if not phone:
        return Response({'error': 'Phone is required'}, status=status.HTTP_400_BAD_REQUEST)

    wallet, _ = Wallet.objects.get_or_create(phone=phone)

    if request.method == 'GET':
        return Response({'phone': phone, 'balance': str(wallet.balance)})

    action = request.data.get('action', 'topup')
    try:
        amount = Decimal(str(request.data.get('amount', 0)))
    except Exception:
        return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

    if amount <= 0:
        return Response({'error': 'Amount must be positive'}, status=status.HTTP_400_BAD_REQUEST)

    if action == 'topup':
        wallet.balance += amount
    elif action == 'debit':
        if wallet.balance < amount:
            return Response({'error': 'Insufficient wallet balance'}, status=status.HTTP_400_BAD_REQUEST)
        wallet.balance -= amount
    else:
        return Response({'error': 'Unknown action'}, status=status.HTTP_400_BAD_REQUEST)

    wallet.save(update_fields=['balance', 'updated_at'])
    return Response({'phone': phone, 'balance': str(wallet.balance)})


@api_view(['GET', 'POST'])
@permission_classes([permissions.AllowAny])
def scratch_reward(request):
    client_key = str(request.data.get('client_key') or request.query_params.get('client_key') or '').strip()
    if not client_key:
        return Response({'error': 'client_key required'}, status=status.HTTP_400_BAD_REQUEST)

    claim, created = ScratchClaim.objects.get_or_create(
        client_key=client_key,
        defaults={
            'reward_code': 'FIRST TIME USER',
            'reward_amount': Decimal('50.00'),
        },
    )

    if request.method == 'GET':
        return Response(
            {
                'claimed': claim.claimed,
                'reward_code': claim.reward_code,
                'reward_amount': str(claim.reward_amount),
            }
        )

    if claim.claimed:
        return Response(
            {
                'claimed': True,
                'reward_code': claim.reward_code,
                'reward_amount': str(claim.reward_amount),
                'message': 'Already claimed',
            }
        )

    phone = _normalize_phone(request.data.get('phone') or '')
    claim.claimed = True
    claim.phone = phone
    claim.save(update_fields=['claimed', 'phone'])

    balance = None
    if phone:
        wallet, _ = Wallet.objects.get_or_create(phone=phone)
        wallet.balance += claim.reward_amount
        wallet.save(update_fields=['balance', 'updated_at'])
        balance = str(wallet.balance)

    return Response(
        {
            'claimed': True,
            'reward_code': claim.reward_code,
            'reward_amount': str(claim.reward_amount),
            'wallet_balance': balance,
            'message': f'You won ₹{claim.reward_amount} + coupon {claim.reward_code}',
        }
    )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def pay_with_wallet(request):
    order_id = request.data.get('order_id')
    phone = _normalize_phone(request.data.get('phone') or '')
    try:
        amount = Decimal(str(request.data.get('amount', 0)))
    except Exception:
        return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

    if not order_id or not phone or amount <= 0:
        return Response({'error': 'order_id, phone and amount required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        order = Order.objects.get(pk=order_id)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

    wallet, _ = Wallet.objects.get_or_create(phone=phone)
    if wallet.balance < amount:
        return Response({'error': 'Insufficient wallet balance'}, status=status.HTTP_400_BAD_REQUEST)

    wallet.balance -= amount
    wallet.save(update_fields=['balance', 'updated_at'])
    order.wallet_used = (order.wallet_used or 0) + amount
    if amount >= order.total:
        order.payment_status = 'completed'
        order.status = 'confirmed'
        order.payment_id = f'wallet-{order.id}'
    order.save()

    return Response(
        {
            'status': 'success',
            'wallet_balance': str(wallet.balance),
            'wallet_used': str(order.wallet_used),
            'payment_status': order.payment_status,
        }
    )
