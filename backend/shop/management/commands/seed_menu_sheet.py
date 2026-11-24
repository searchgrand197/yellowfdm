"""Upsert products from the Burgers / Wraps / Garlic Bread / Pasta / Dessert & Dips sheet."""

from decimal import Decimal

from django.core.management.base import BaseCommand

from shop.models import Category, MenuItem

CATEGORIES = [
    {'slug': 'burger', 'name': 'Burger', 'icon': 'burger', 'sort_order': 1},
    {'slug': 'sandwich', 'name': 'Sandwich', 'icon': 'sandwich', 'sort_order': 5},
    {'slug': 'pasta', 'name': 'Pasta', 'icon': 'pasta', 'sort_order': 8},
    {'slug': 'extra-dip', 'name': 'Extra DIP', 'icon': 'dip', 'sort_order': 9},
    {'slug': 'dessert', 'name': 'Dessert', 'icon': 'dessert', 'sort_order': 10},
]

# (category_slug, name, price, subtitle, description, image_filename, sort_order)
ITEMS = [
    # Burgers (sync prices)
    ('burger', 'Tikki Burger', '55', 'Crispy tikki', 'Classic aloo tikki burger.', 'menu-sheet-tikki-burger.png', 1),
    ('burger', 'Cheese Burger', '70', 'Cheesy classic', 'Veg patty with melted cheese.', 'menu-sheet-cheese-burger.png', 2),
    ('burger', 'Stuff Burger', '80', 'Loaded veg', 'Stuffed veg burger with fresh toppings.', 'menu-sheet-stuff-burger.png', 3),
    ('burger', 'Maharaja Burger', '110', 'Royal size', 'Big stacked veg maharaja burger.', 'menu-sheet-maharaja-burger.png', 4),
    ('burger', 'Veg Sub', '120', 'Footlong style', 'Loaded vegetarian sub sandwich.', 'menu-sheet-veg-sub.png', 5),
    # Wraps & sandwiches
    ('sandwich', 'Tandoori Wrap', '70', 'Smoky wrap', 'Tandoori-spiced veg wrap.', 'menu-sheet-tandoori-wrap.png', 1),
    ('sandwich', 'Paneer Wrap', '120', 'Paneer filled', 'Soft wrap with grilled paneer.', 'menu-sheet-paneer-wrap.png', 2),
    ('sandwich', 'Grilled Sandwich', '70', 'Toasted', 'Crispy grilled veg sandwich.', 'menu-sheet-grilled-sandwich.png', 3),
    ('sandwich', 'Paneer Sandwich', '120', 'Paneer toast', 'Grilled sandwich with paneer filling.', 'menu-sheet-paneer-sandwich.png', 4),
    # Garlic bread & calzone
    (
        'sandwich',
        'Garlic Bread',
        '120',
        'Corn, Jalapeno, Herbs & Cheese',
        'Garlic bread topped with corn, jalapeno, herbs and cheese.',
        'menu-sheet-garlic-bread.png',
        5,
    ),
    (
        'sandwich',
        'Spicy Garlic Bread',
        '130',
        'Onion, Capsicum, Red Paprika, Jalapeno, Herbs & Cheese',
        'Spicy garlic bread with onion, capsicum, paprika, jalapeno, herbs and cheese.',
        'menu-sheet-spicy-garlic-bread.png',
        6,
    ),
    (
        'sandwich',
        'Paneer Garlic Bread',
        '150',
        'Onion, Tandoori Paneer, Herbs & Cheese',
        'Garlic bread with onion, tandoori paneer, herbs and cheese.',
        'menu-sheet-paneer-garlic-bread.png',
        7,
    ),
    (
        'sandwich',
        'Calzone',
        '150',
        'Onion, Tandoori Paneer, Herbs & Cheese',
        'Folded calzone with onion, tandoori paneer, herbs and cheese.',
        'menu-sheet-calzone.png',
        8,
    ),
    # Pasta
    ('pasta', 'Red Sauce Pasta', '120', 'Tangy tomato', 'Pasta in classic red sauce.', 'menu-sheet-red-sauce-pasta.png', 1),
    ('pasta', 'Mix Souce Pasta', '125', 'Mix sauce', 'Pasta tossed in mix sauce.', 'menu-sheet-mix-sauce-pasta.png', 2),
    ('pasta', 'Makhani Sauce Pasta', '125', 'Creamy makhani', 'Pasta in rich makhani sauce.', 'menu-sheet-makhani-pasta.png', 3),
    ('pasta', 'White Sauce Pasta', '130', 'Creamy white', 'Pasta in white cream sauce.', 'menu-sheet-white-sauce-pasta.png', 4),
    # Dessert
    (
        'dessert',
        'Brownie Chocolate',
        '99',
        'Warm chocolate',
        'Rich chocolate brownie.',
        'menu-sheet-brownie.png',
        1,
    ),
    # Extra dips
    (
        'extra-dip',
        'Mayonnaise Dip / Spicy Dip',
        '10',
        'Extra dip',
        'Choose mayonnaise or spicy dip.',
        'menu-sheet-mayo-dip.png',
        1,
    ),
    (
        'extra-dip',
        'Tandoori Dip / Makhani Dip',
        '20',
        'Extra dip',
        'Choose tandoori or makhani dip.',
        'menu-sheet-tandoori-dip.png',
        2,
    ),
    (
        'extra-dip',
        'Mint Mayo / Achari Mayo',
        '20',
        'Extra dip',
        'Choose mint mayo or achari mayo.',
        'menu-sheet-mint-mayo.png',
        3,
    ),
]


class Command(BaseCommand):
    help = 'Seed/update menu items from the kitchen sheet (burgers, wraps, garlic bread, pasta, dips)'

    def handle(self, *args, **options):
        cats = {}
        for row in CATEGORIES:
            cat, created = Category.objects.update_or_create(
                slug=row['slug'],
                defaults={
                    'name': row['name'],
                    'icon': row['icon'],
                    'sort_order': row['sort_order'],
                },
            )
            cats[row['slug']] = cat
            self.stdout.write(f'{"Created" if created else "OK"} category {cat.slug}')

        for slug, name, price, subtitle, description, image_file, sort_order in ITEMS:
            cat = cats[slug]
            image_url = f'/media/images/{image_file}'
            item, created = MenuItem.objects.update_or_create(
                category=cat,
                name=name,
                defaults={
                    'subtitle': subtitle,
                    'description': description,
                    'price': Decimal(price),
                    'image_url': image_url,
                    'available': True,
                    'sort_order': sort_order,
                    'delivery_mins': '20-30',
                    'free_delivery': True,
                    'rating': Decimal('4.6'),
                    'review_count': 50,
                },
            )
            # Keep an existing cutout image if seed file is missing and item already had one
            self.stdout.write(
                f'{"Created" if created else "Updated"} {cat.slug}/{item.name} ₹{price} → {image_url}'
            )

        self.stdout.write(self.style.SUCCESS(f'Done. Sheet items: {len(ITEMS)}'))
