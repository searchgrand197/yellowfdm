from django.core.management.base import BaseCommand

from shop.models import Category, MenuItem


CATEGORIES = [
    {'name': 'Burger', 'slug': 'burger', 'icon': 'burger', 'sort_order': 1},
    {'name': 'Pizza', 'slug': 'pizza', 'icon': 'pizza', 'sort_order': 2},
    {'name': 'Fries', 'slug': 'fries', 'icon': 'fries', 'sort_order': 3},
    {'name': 'Drinks', 'slug': 'drinks', 'icon': 'drinks', 'sort_order': 4},
    {'name': 'Meat', 'slug': 'meat', 'icon': 'meat', 'sort_order': 5},
]

ITEMS = [
    {
        'category': 'burger',
        'name': 'Classic Smash Burger',
        'subtitle': 'American Classic',
        'description': 'Juicy double smash patties, melted cheddar, pickles, onions, and house sauce on a toasted brioche bun.',
        'price': '12.99',
        'original_price': '15.99',
        'image_url': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
        'delivery_mins': '25-35',
        'rating': '4.8',
        'review_count': 3200,
        'is_popular': True,
        'is_featured': True,
        'promo_label': 'Burgers Express 30% Off',
    },
    {
        'category': 'burger',
        'name': 'BBQ Bacon Burger',
        'subtitle': 'Smoky & Bold',
        'description': 'Flame-grilled beef, crispy bacon, smoked cheddar, caramelized onions, and tangy BBQ glaze.',
        'price': '14.49',
        'original_price': '16.99',
        'image_url': 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80',
        'delivery_mins': '30-40',
        'rating': '4.6',
        'review_count': 1850,
        'is_popular': True,
    },
    {
        'category': 'pizza',
        'name': 'Pepperoni Pizza',
        'subtitle': 'Italian Pizza',
        'description': 'Crispy thin crust topped with spicy pepperoni, molten mozzarella, and our slow-simmered tomato sauce.',
        'price': '19.99',
        'original_price': '25.99',
        'image_url': 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80',
        'delivery_mins': '35-40',
        'rating': '4.5',
        'review_count': 3000,
        'is_popular': True,
    },
    {
        'category': 'pizza',
        'name': 'Margherita Delight',
        'subtitle': 'Fresh & Light',
        'description': 'San Marzano tomatoes, fresh mozzarella, basil leaves, and a drizzle of olive oil on a wood-fired crust.',
        'price': '16.99',
        'original_price': '19.99',
        'image_url': 'https://images.unsplash.com/photo-1574071318508-1cdbab80d264?auto=format&fit=crop&w=800&q=80',
        'delivery_mins': '30-40',
        'rating': '4.7',
        'review_count': 2100,
        'is_popular': True,
    },
    {
        'category': 'fries',
        'name': 'Truffle Parmesan Fries',
        'subtitle': 'Loaded Sides',
        'description': 'Golden crispy fries tossed with truffle oil, shaved parmesan, and fresh herbs.',
        'price': '7.99',
        'original_price': '9.49',
        'image_url': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80',
        'delivery_mins': '20-30',
        'rating': '4.4',
        'review_count': 980,
        'is_popular': True,
    },
    {
        'category': 'fries',
        'name': 'Loaded Cheese Fries',
        'subtitle': 'Comfort Classic',
        'description': 'Crispy fries smothered in cheddar sauce, jalapeños, and crispy onion bits.',
        'price': '8.49',
        'image_url': 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=800&q=80',
        'delivery_mins': '20-25',
        'rating': '4.3',
        'review_count': 760,
        'is_popular': True,
    },
    {
        'category': 'drinks',
        'name': 'Citrus Cooler',
        'subtitle': 'Refreshing',
        'description': 'Fresh-squeezed orange, lemon, and mint over ice — the perfect pairing for spicy bites.',
        'price': '4.99',
        'image_url': 'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?auto=format&fit=crop&w=800&q=80',
        'delivery_mins': '15-20',
        'rating': '4.6',
        'review_count': 540,
        'is_popular': False,
        'free_delivery': True,
    },
    {
        'category': 'drinks',
        'name': 'Iced Chocolate Shake',
        'subtitle': 'Sweet Treat',
        'description': 'Rich chocolate ice cream blended thick with milk and topped with whipped cream.',
        'price': '5.99',
        'original_price': '6.99',
        'image_url': 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80',
        'delivery_mins': '15-25',
        'rating': '4.8',
        'review_count': 1120,
        'is_popular': True,
    },
    {
        'category': 'meat',
        'name': 'Grilled Steak Bowl',
        'subtitle': 'Protein Packed',
        'description': 'Tender grilled steak over herbed rice with roasted veggies and chimichurri.',
        'price': '22.99',
        'original_price': '26.99',
        'image_url': 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&q=80',
        'delivery_mins': '35-45',
        'rating': '4.7',
        'review_count': 890,
        'is_popular': True,
    },
    {
        'category': 'meat',
        'name': 'Honey Glazed Wings',
        'subtitle': 'Shareable',
        'description': 'Crispy chicken wings tossed in sticky honey glaze with sesame and green onion.',
        'price': '13.99',
        'image_url': 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=800&q=80',
        'delivery_mins': '30-40',
        'rating': '4.5',
        'review_count': 1540,
        'is_popular': True,
    },
]


class Command(BaseCommand):
    help = 'Seed categories and menu items for Foodporium'

    def handle(self, *args, **options):
        Category.objects.all().delete()
        MenuItem.objects.all().delete()

        cats = {}
        for data in CATEGORIES:
            cats[data['slug']] = Category.objects.create(**data)

        for data in ITEMS:
            slug = data.pop('category')
            MenuItem.objects.create(category=cats[slug], **data)

        self.stdout.write(self.style.SUCCESS(f'Seeded {len(CATEGORIES)} categories and {len(ITEMS)} items.'))
