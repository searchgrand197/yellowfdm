from django.contrib import admin

from .models import Category, Favorite, MenuItem, Order, OrderItem, ScratchClaim, Topping, Wallet


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'icon', 'sort_order')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Topping)
class ToppingAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'available')


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price', 'rating', 'is_popular', 'is_featured')
    list_filter = ('category', 'is_popular', 'is_featured', 'free_delivery')
    search_fields = ('name', 'subtitle')
    filter_horizontal = ('toppings',)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'guest_name', 'status', 'total', 'created_at')
    list_filter = ('status',)
    inlines = [OrderItemInline]


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ('user', 'item', 'created_at')


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ('phone', 'balance', 'updated_at')
    search_fields = ('phone',)


@admin.register(ScratchClaim)
class ScratchClaimAdmin(admin.ModelAdmin):
    list_display = ('client_key', 'phone', 'reward_code', 'reward_amount', 'claimed', 'created_at')

