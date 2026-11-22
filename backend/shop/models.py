from django.conf import settings
from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=80)
    slug = models.SlugField(unique=True)
    icon = models.CharField(max_length=40, default='burger')
    image_url = models.CharField(max_length=500, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'name']
        verbose_name_plural = 'categories'

    def __str__(self):
        return self.name


class Topping(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    available = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class MenuItem(models.Model):
    category = models.ForeignKey(Category, related_name='items', on_delete=models.CASCADE)
    name = models.CharField(max_length=120)
    subtitle = models.CharField(max_length=120, blank=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    original_price = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    image_url = models.CharField(max_length=500)
    delivery_mins = models.CharField(max_length=20, default='30-40')
    free_delivery = models.BooleanField(default=True)
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=4.5)
    review_count = models.PositiveIntegerField(default=0)
    is_popular = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    promo_label = models.CharField(max_length=80, blank=True)
    toppings = models.ManyToManyField(Topping, blank=True, related_name='menu_items')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_popular', 'name']

    def __str__(self):
        return self.name


class Favorite(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='favorites', on_delete=models.CASCADE)
    item = models.ForeignKey(MenuItem, related_name='favorited_by', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'item')


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('preparing', 'Preparing'),
        ('on_the_way', 'On the way'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='orders',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    guest_name = models.CharField(max_length=120, blank=True)
    guest_phone = models.CharField(max_length=40, blank=True)
    address = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    payment_status = models.CharField(max_length=20, default='pending')
    razorpay_order_id = models.CharField(max_length=120, blank=True)
    payment_id = models.CharField(max_length=120, blank=True)
    wallet_used = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Order #{self.pk} — {self.status}'


class Wallet(models.Model):
    phone = models.CharField(max_length=20, unique=True)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.phone} — ₹{self.balance}'


class ScratchClaim(models.Model):
    client_key = models.CharField(max_length=64, unique=True)
    phone = models.CharField(max_length=20, blank=True)
    reward_code = models.CharField(max_length=40, default='FIRST TIME USER')
    reward_amount = models.DecimalField(max_digits=8, decimal_places=2, default=50)
    claimed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.client_key} — {self.claimed}'


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    menu_item = models.ForeignKey(MenuItem, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=8, decimal_places=2)
    toppings_text = models.CharField(max_length=255, blank=True)

    @property
    def line_total(self):
        return self.quantity * self.unit_price
