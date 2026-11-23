from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import admin_api, views

router = DefaultRouter()
router.register('categories', views.CategoryViewSet, basename='category')
router.register('items', views.MenuItemViewSet, basename='menuitem')
router.register('orders', views.OrderViewSet, basename='order')

admin_router = DefaultRouter()
admin_router.register('categories', admin_api.AdminCategoryViewSet, basename='admin-category')
admin_router.register('items', admin_api.AdminMenuItemViewSet, basename='admin-item')
admin_router.register('toppings', admin_api.AdminToppingViewSet, basename='admin-topping')
admin_router.register('coupons', admin_api.AdminCouponViewSet, basename='admin-coupon')
admin_router.register('combos', admin_api.AdminComboViewSet, basename='admin-combo')
admin_router.register('orders', admin_api.AdminOrderViewSet, basename='admin-order')

urlpatterns = [
    path('', include(router.urls)),
    path('config/', views.public_config, name='public-config'),
    path('combos/', views.public_combos, name='public-combos'),
    path('coupons/', views.public_coupons, name='public-coupons'),
    path('auth/firebase/', views.firebase_login, name='firebase-login'),
    path('auth/otp/send/', views.send_otp, name='otp-send'),
    path('auth/otp/verify/', views.verify_otp, name='otp-verify'),
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
    path('admin/shop/', admin_api.admin_shop_settings, name='admin-shop'),
    path('admin/orders/new/', admin_api.admin_orders_new, name='admin-orders-new'),
    path('admin/upload/', admin_api.admin_upload, name='admin-upload'),
    path('admin/categories/reorder/', admin_api.admin_reorder_categories, name='admin-reorder-categories'),
    path('admin/items/reorder/', admin_api.admin_reorder_items, name='admin-reorder-items'),
    path('admin/combos/reorder/', admin_api.admin_reorder_combos, name='admin-reorder-combos'),
    path('admin/', include(admin_router.urls)),
]
