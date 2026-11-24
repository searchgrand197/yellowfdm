"""Align the live menu with Foodporium_Complete_Printable_Menu.pdf."""

from decimal import Decimal

from django.core.management.base import BaseCommand

from shop.models import Category, Combo, MenuItem, Topping

CATEGORIES = [
    {
        'slug': 'burger',
        'name': 'Burgers',
        'icon': 'burger',
        'image': 'cat-ai-burger.png',
        'sort_order': 1,
    },
    {
        'slug': 'wraps-sandwiches',
        'name': 'Wraps & Sandwiches',
        'icon': 'sandwich',
        'image': 'cat-ai-wraps.png',
        'sort_order': 2,
    },
    {
        'slug': 'garlic-bread',
        'name': 'Garlic Bread',
        'icon': 'bread',
        'image': 'cat-ai-garlic-bread.png',
        'sort_order': 3,
    },
    {
        'slug': 'pasta',
        'name': 'Pasta',
        'icon': 'pasta',
        'image': 'cat-ai-pasta.png',
        'sort_order': 4,
    },
    {
        'slug': 'pizza',
        'name': 'Pizza',
        'icon': 'pizza',
        'image': 'cat-ai-pizza.png',
        'sort_order': 5,
    },
    {
        'slug': 'dessert',
        'name': 'Dessert',
        'icon': 'dessert',
        'image': 'cat-ai-dessert.png',
        'sort_order': 6,
    },
    {
        'slug': 'extra-dip',
        'name': 'Extra Dips',
        'icon': 'dip',
        'image': 'cat-ai-dips.png',
        'sort_order': 7,
    },
]

# Non-pizza items: (cat, name, price, subtitle, description, image, sort)
FAST_FOOD = [
    ('burger', 'Tikki Burger', '55', '', 'Classic aloo tikki burger.', 'menu-ai-tikki-burger.png', 1),
    ('burger', 'Cheese Burger', '70', '', 'Veg cheese burger.', 'menu-ai-cheese-burger.png', 2),
    ('burger', 'Stuff Burger', '80', '', 'Stuffed veg burger.', 'menu-ai-stuff-burger.png', 3),
    ('burger', 'Maharaja Burger', '110', '', 'Royal veg burger.', 'menu-ai-maharaja-burger.png', 4),
    ('burger', 'Veg Sub', '120', '', 'Loaded vegetarian sub.', 'menu-ai-veg-sub.png', 5),
    ('wraps-sandwiches', 'Tandoori Wrap', '70', '', 'Tandoori-spiced veg wrap.', 'menu-ai-tandoori-wrap.png', 1),
    ('wraps-sandwiches', 'Paneer Wrap', '120', '', 'Grilled paneer wrap.', 'menu-ai-paneer-wrap.png', 2),
    ('wraps-sandwiches', 'Grilled Sandwich', '70', '', 'Crispy grilled veg sandwich.', 'menu-ai-grilled-sandwich.png', 3),
    ('wraps-sandwiches', 'Paneer Sandwich', '120', '', 'Paneer grilled sandwich.', 'menu-ai-paneer-sandwich.png', 4),
    (
        'garlic-bread',
        'Garlic Bread',
        '120',
        'Corn, Jalapeno, Herbs & Cheese',
        'Garlic bread with corn, jalapeno, herbs and cheese.',
        'menu-ai-garlic-bread.png',
        1,
    ),
    (
        'garlic-bread',
        'Spicy Garlic Bread',
        '130',
        'Onion, Capsicum, Red Paprika, Jalapeno, Herbs & Cheese',
        'Spicy garlic bread with onion, capsicum, paprika, jalapeno, herbs and cheese.',
        'menu-ai-spicy-garlic-bread.png',
        2,
    ),
    (
        'garlic-bread',
        'Paneer Garlic Bread',
        '150',
        'Onion, Tandoori Paneer, Herbs & Cheese',
        'Garlic bread with onion, tandoori paneer, herbs and cheese.',
        'menu-ai-paneer-garlic-bread.png',
        3,
    ),
    (
        'garlic-bread',
        'Calzone',
        '150',
        'Onion, Tandoori Paneer, Herbs & Cheese',
        'Folded calzone with onion, tandoori paneer, herbs and cheese.',
        'menu-ai-calzone.png',
        4,
    ),
    ('pasta', 'Red Sauce Pasta', '120', '', 'Pasta in classic red sauce.', 'menu-ai-red-sauce-pasta.png', 1),
    ('pasta', 'Mix Sauce Pasta', '125', '', 'Pasta in mix sauce.', 'menu-ai-mix-sauce-pasta.png', 2),
    ('pasta', 'Makhani Sauce Pasta', '125', '', 'Pasta in makhani sauce.', 'menu-ai-makhani-pasta.png', 3),
    ('pasta', 'White Sauce Pasta', '130', '', 'Pasta in white cream sauce.', 'menu-ai-white-sauce-pasta.png', 4),
    ('dessert', 'Brownie Chocolate', '99', '', 'Rich chocolate brownie.', 'menu-ai-brownie.png', 1),
    (
        'extra-dip',
        'Mayonnaise Dip / Spicy Dip',
        '10',
        '',
        'Mayonnaise or spicy dip.',
        'menu-ai-mayo-dip.png',
        1,
    ),
    (
        'extra-dip',
        'Tandoori Dip / Makhani Dip',
        '20',
        '',
        'Tandoori or makhani dip.',
        'menu-ai-tandoori-dip.png',
        2,
    ),
    (
        'extra-dip',
        'Mint Mayo / Achari Mayo',
        '20',
        '',
        'Mint mayo or achari mayo.',
        'menu-ai-mint-mayo.png',
        3,
    ),
]

# Pizza flavors: name, subtitle, (S, M, L), image, sort
PIZZAS = [
    ('Onion Pizza', '', ('79', '150', '200'), 'menu-ai-pizza-onion.png', 1),
    ('Capsicum Pizza', '', ('85', '150', '200'), 'menu-ai-pizza-capsicum.png', 2),
    ('Tomato Pizza', '', ('85', '150', '200'), 'menu-ai-pizza-tomato.png', 3),
    ('Sweet Corn Pizza', '', ('80', '150', '200'), 'menu-ai-pizza-sweet-corn.png', 4),
    (
        'Queen Margrita',
        'Sweet corn + Mozzarella + Herbs',
        ('140', '249', '350'),
        'menu-ai-pizza-queen-margrita.png',
        5,
    ),
    (
        'Paneer Pizza',
        'Crunchy onion + Paneer + Mozzarella',
        ('140', '249', '350'),
        'menu-ai-pizza-paneer.png',
        6,
    ),
    (
        'Paneer Makhani',
        'Paneer + Capsicum on Makhani sauce',
        ('150', '279', '370'),
        'menu-ai-pizza-paneer-makhani.png',
        7,
    ),
    (
        'Peppy Paneer',
        'Marinated paneer + Capsicum + Red paprika',
        ('150', '250', '350'),
        'menu-ai-pizza-peppy-paneer.png',
        8,
    ),
    (
        'Deluxe Veg',
        'Onion + Capsicum + Mushroom + Paneer + Corn',
        ('180', '320', '400'),
        'menu-ai-pizza-deluxe-veg.png',
        9,
    ),
    (
        'Mix Veg',
        'Onion + Capsicum + Corn + Paneer + Paprika + Olive',
        ('170', '320', '420'),
        'menu-ai-pizza-mix-veg.png',
        10,
    ),
    (
        'Farm House',
        'Onion + Capsicum + Tomato + Paneer + Mushroom + Jalapeno',
        ('200', '360', '450'),
        'menu-ai-pizza-farm-house.png',
        11,
    ),
    (
        'Paneer Crunchy',
        'Onion + Capsicum + Corn + Paprika + Olive + Paneer + Tandoori',
        ('199', '360', '450'),
        'menu-ai-pizza-paneer-crunchy.png',
        12,
    ),
]

SIZE_SUFFIX = {'S': 'Small', 'M': 'Medium', 'L': 'Large'}

# Combos: name, badge, price, save, item name keys (exact MenuItem names), image
COMBOS = [
    (
        'Couple Fast Food',
        'Couple',
        '299',
        '61',
        ['Paneer Wrap', 'Paneer Sandwich', 'Red Sauce Pasta'],
        'menu-ai-combo-couple-fast.png',
    ),
    (
        'Couple Pizza Special',
        'Couple',
        '369',
        '20',
        ['Paneer Pizza (Medium)', 'Garlic Bread', 'Mayonnaise Dip / Spicy Dip'],
        'menu-ai-combo-couple-pizza.png',
    ),
    (
        'Couple Royal Feast',
        'Couple',
        '499',
        '110',
        ['Farm House (Medium)', 'Paneer Garlic Bread', 'Brownie Chocolate'],
        'menu-ai-combo-couple-royal.png',
    ),
    (
        'Solo Maharaja Meal',
        'Solo',
        '299',
        '30',
        ['Maharaja Burger', 'Red Sauce Pasta', 'Brownie Chocolate'],
        'menu-ai-combo-solo-maharaja.png',
    ),
    (
        'Fast Food Feast',
        'Feast',
        '359',
        '26',
        ['Maharaja Burger', 'Paneer Garlic Bread', 'Mix Sauce Pasta'],
        'menu-ai-combo-fast-feast.png',
    ),
    (
        'Large Feast Family',
        'Family',
        '599',
        '100',
        ['Farm House (Large)', 'Paneer Garlic Bread', 'Brownie Chocolate'],
        'menu-ai-combo-large-feast.png',
    ),
    (
        'Mega Deluxe Large Feast Combo',
        'Mega',
        '649',
        '110',
        ['Deluxe Veg (Large)', 'White Sauce Pasta', 'Spicy Garlic Bread', 'Brownie Chocolate'],
        'menu-ai-combo-mega-deluxe.png',
    ),
]


def _img(path: str) -> str:
    # Cache-bust so browsers pick up rembg cutouts
    return f'/media/images/{path}?v=bg3'


class Command(BaseCommand):
    help = 'Rebuild categories, products, toppings links, and combos from the printable PDF menu'

    def handle(self, *args, **options):
        # Hide everything first, then re-enable PDF items
        MenuItem.objects.all().update(available=False)
        Combo.objects.all().update(active=False)

        cats = {}
        for row in CATEGORIES:
            cat, _ = Category.objects.update_or_create(
                slug=row['slug'],
                defaults={
                    'name': row['name'],
                    'icon': row['icon'],
                    'image_url': _img(row['image']),
                    'sort_order': row['sort_order'],
                },
            )
            cats[row['slug']] = cat
            self.stdout.write(f'Category {cat.name}')

        keep_slugs = {c['slug'] for c in CATEGORIES}
        # Soft-hide other categories by pushing sort order (API filters to those with stock)
        Category.objects.exclude(slug__in=keep_slugs).update(sort_order=900)

        by_name: dict[str, MenuItem] = {}

        for slug, name, price, subtitle, description, image, sort_order in FAST_FOOD:
            item, created = MenuItem.objects.update_or_create(
                category=cats[slug],
                name=name,
                defaults={
                    'subtitle': subtitle,
                    'description': description,
                    'price': Decimal(price),
                    'image_url': _img(image),
                    'available': True,
                    'sort_order': sort_order,
                    'delivery_mins': '20-30',
                    'free_delivery': True,
                    'rating': Decimal('4.6'),
                    'review_count': 80,
                    'is_popular': sort_order <= 2,
                    'is_featured': slug == 'burger' and sort_order == 1,
                },
            )
            by_name[name] = item
            self.stdout.write(f'{"+" if created else "~"} {name} ₹{price}')

        pizza_cat = cats['pizza']
        pizza_items_for_toppings: list[MenuItem] = []
        for idx, (base, subtitle, prices, image, sort_order) in enumerate(PIZZAS):
            for size_key, price in zip(('S', 'M', 'L'), prices):
                full_name = f'{base} ({SIZE_SUFFIX[size_key]})'
                item, created = MenuItem.objects.update_or_create(
                    category=pizza_cat,
                    name=full_name,
                    defaults={
                        'subtitle': subtitle,
                        'description': subtitle or f'{base} — {SIZE_SUFFIX[size_key]}',
                        'price': Decimal(price),
                        'image_url': _img(image),
                        'available': True,
                        'sort_order': sort_order * 10 + {'S': 1, 'M': 2, 'L': 3}[size_key],
                        'delivery_mins': '25-35',
                        'free_delivery': True,
                        'rating': Decimal('4.5'),
                        'review_count': 60,
                        'is_popular': size_key == 'M' and sort_order <= 4,
                        'is_featured': base == 'Farm House' and size_key == 'M',
                    },
                )
                by_name[full_name] = item
                pizza_items_for_toppings.append(item)
                self.stdout.write(f'{"+" if created else "~"} {full_name} ₹{price}')

        # Attach size-matched toppings
        toppings_s = list(Topping.objects.filter(name__endswith='(Small)', available=True))
        toppings_m = list(Topping.objects.filter(name__endswith='(Medium)', available=True))
        toppings_l = list(Topping.objects.filter(name__endswith='(Large)', available=True))
        for item in pizza_items_for_toppings:
            if '(Small)' in item.name:
                item.toppings.set(toppings_s)
            elif '(Medium)' in item.name:
                item.toppings.set(toppings_m)
            elif '(Large)' in item.name:
                item.toppings.set(toppings_l)

        # Combos
        for sort_order, (name, badge, price, save, item_names, image) in enumerate(COMBOS):
            parts = []
            missing = False
            for n in item_names:
                it = by_name.get(n)
                if not it:
                    self.stdout.write(self.style.WARNING(f'Combo {name}: missing {n}'))
                    missing = True
                    break
                parts.append(it)
            if missing or len(parts) < 2:
                continue
            combo, created = Combo.objects.update_or_create(
                name=name,
                defaults={
                    'badge': badge,
                    'item_a': parts[0],
                    'item_b': parts[1],
                    'item_c': parts[2] if len(parts) > 2 else None,
                    'item_d': parts[3] if len(parts) > 3 else None,
                    'price': Decimal(price),
                    'save_amount': Decimal(save),
                    'sort_order': sort_order,
                    'active': True,
                    'image_url': _img(image),
                },
            )
            self.stdout.write(f'{"+" if created else "~"} combo {combo.name} ₹{price}')

        self.stdout.write(
            self.style.SUCCESS(
                f'Done. Available items: {MenuItem.objects.filter(available=True).count()} · '
                f'Active combos: {Combo.objects.filter(active=True).count()}'
            )
        )
