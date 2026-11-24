"""Seed EXTRA TOPPINGS from the kitchen menu (S / M / L prices)."""

from decimal import Decimal

from django.core.management.base import BaseCommand

from shop.models import MenuItem, Topping

# name -> (small, medium, large)
MENU = {
    'Onion': (20, 30, 40),
    'Capsicum': (20, 30, 40),
    'Tomato': (20, 30, 40),
    'Sweet Corn': (20, 30, 40),
    'Paprika': (20, 30, 40),
    'Olive': (20, 30, 40),
    'Jalapeno': (20, 30, 40),
    'Mushroom': (25, 40, 60),
    'Paneer (Extra Portion)': (50, 70, 80),
    'Extra Cheese': (80, 150, 200),
}

SIZE_LABEL = {'S': 'Small', 'M': 'Medium', 'L': 'Large'}
SIZE_PRICE_IDX = {'S': 0, 'M': 1, 'L': 2}

# Category slugs that get each size's topping set
SIZE_CATEGORIES = {
    'S': {'pizza', 'pizza-premium'},
    'M': {'pizza-premium-m'},
    'L': {'pizza-premium-l'},
}


class Command(BaseCommand):
    help = 'Create all Extra Toppings (S/M/L) and attach to pizza products by size'

    def add_arguments(self, parser):
        parser.add_argument(
            '--replace',
            action='store_true',
            help='Remove old toppings not in this menu before seeding',
        )

    def handle(self, *args, **options):
        by_size: dict[str, list[Topping]] = {'S': [], 'M': [], 'L': []}

        for base_name, prices in MENU.items():
            for size, idx in SIZE_PRICE_IDX.items():
                name = f'{base_name} ({SIZE_LABEL[size]})'
                price = Decimal(str(prices[idx]))
                topping, created = Topping.objects.update_or_create(
                    name=name,
                    defaults={'price': price, 'available': True},
                )
                by_size[size].append(topping)
                self.stdout.write(
                    f'{"Created" if created else "Updated"} {name} — ₹{price}'
                )

        if options['replace']:
            keep_ids = {t.id for group in by_size.values() for t in group}
            deleted, _ = Topping.objects.exclude(id__in=keep_ids).delete()
            self.stdout.write(f'Removed {deleted} old topping row(s)')

        linked = 0
        for size, slugs in SIZE_CATEGORIES.items():
            toppings = by_size[size]
            items = MenuItem.objects.filter(category__slug__in=slugs)
            for item in items:
                item.toppings.set(toppings)
                linked += 1
                self.stdout.write(f'  linked {len(toppings)} toppings → {item.name}')

        self.stdout.write(
            self.style.SUCCESS(
                f'Done. Toppings: {Topping.objects.count()} · products updated: {linked}'
            )
        )
