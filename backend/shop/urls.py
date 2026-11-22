from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register('categories', views.CategoryViewSet, basename='category')
router.register('items', views.MenuItemViewSet, basename='menuitem')
router.register('orders', views.OrderViewSet, basename='order')

urlpatterns = [
    path('', include(router.urls)),
    path('config/', views.public_config, name='public-config'),
    path('auth/firebase/', views.firebase_login, name='firebase-login'),
    path('auth/register/', views.register, name='register'),
    path('auth/login/', views.login_view, name='login'),
    path('auth/logout/', views.logout_view, name='logout'),
    path('auth/me/', views.me, name='me'),
    path('favorites/', views.favorites, name='favorites'),
    path('favorites/<int:item_id>/', views.favorites, name='favorite-detail'),
    path('payments/initiate/', views.initiate_payment, name='initiate-payment'),
    path('payments/verify/', views.verify_payment, name='verify-payment'),
    path('wallet/', views.wallet_view, name='wallet'),
    path('scratch/', views.scratch_reward, name='scratch'),
    path('payments/wallet/', views.pay_with_wallet, name='pay-wallet'),
]
